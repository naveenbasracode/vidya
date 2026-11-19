// Student profile, commitments (school & co-curricular), habits, today's agenda and the timetable.
import { Router } from 'express';
import type { CommitmentKind, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ah, badRequest, notFound, str, int } from '../lib/http.js';
import { addDays, isValidDate, isValidTime, startOfWeek, todayLocal, toMinutes, dayOfWeek, overlaps } from '../lib/dates.js';
import { DEFAULT_SETTINGS, mergeSettings, type SchedulerSettings } from '../domain/scheduler.js';
import { isSubject, SUBJECT_INFO } from '../domain/types.js';
import { publicUser } from './auth.js';
import { ensureWeekGenerated, regenerateWeek, syncActivityHabits } from '../services/students.js';

export const plannerRouter = Router({ mergeParams: true });

const sid = (res: { locals: { student?: { id: string } } }) => res.locals.student!.id;
/** The client sends its local date so "today" matches the family's clock. */
const today = (q: unknown) => (isValidDate(q) ? q : todayLocal());

// ---------------------------------------------------------------------------
// Profile & settings
// ---------------------------------------------------------------------------

plannerRouter.get(
  '/',
  ah(async (_req, res) => {
    const s = res.locals.student!;
    res.json({ student: publicUser(s), settings: mergeSettings(s.settings), defaults: DEFAULT_SETTINGS });
  }),
);

const validateSettings = (raw: Partial<SchedulerSettings>): SchedulerSettings => {
  const s = mergeSettings(raw);
  for (const w of [s.weekdayWindow, s.weekendWindow]) {
    if (!isValidTime(w.start) || !isValidTime(w.end) || toMinutes(w.end) <= toMinutes(w.start)) {
      throw badRequest('Study windows need a valid start time before the end time.');
    }
  }
  s.blockMinutes = int(s.blockMinutes, 'Block length', 15, 120);
  s.breakMinutes = int(s.breakMinutes, 'Break length', 0, 60);
  s.maxBlocksWeekday = int(s.maxBlocksWeekday, 'Weekday blocks', 0, 8);
  s.maxBlocksWeekend = int(s.maxBlocksWeekend, 'Weekend blocks', 0, 10);
  s.skipActivityDays = Boolean(s.skipActivityDays);
  s.studyDays = [...new Set(s.studyDays.map((d) => int(d, 'Study day', 0, 6)))].sort();
  return s;
};

plannerRouter.patch(
  '/',
  ah(async (req, res) => {
    const data: Prisma.UserUpdateInput = {};
    if (req.body.grade !== undefined) data.grade = int(req.body.grade, 'grade', 5, 7);
    if (req.body.name !== undefined) data.name = str(req.body, 'name', { required: true, max: 80 });
    if (req.body.settings !== undefined) data.settings = validateSettings(req.body.settings) as unknown as Prisma.InputJsonValue;
    if (req.body.onboarded !== undefined) data.onboarded = Boolean(req.body.onboarded);
    const student = await prisma.user.update({ where: { id: sid(res) }, data });
    let schedule: Awaited<ReturnType<typeof regenerateWeek>> | null = null;
    // Finishing onboarding or changing preferences rebuilds this week's timetable.
    if (student.onboarded && (req.body.settings !== undefined || req.body.onboarded)) {
      const t = today(req.body.today);
      schedule = await regenerateWeek(student.id, startOfWeek(t), t);
    }
    res.json({ student: publicUser(student), settings: mergeSettings(student.settings), schedule });
  }),
);

// ---------------------------------------------------------------------------
// Commitments (FR2)
// ---------------------------------------------------------------------------

const KINDS: CommitmentKind[] = ['SCHOOL', 'ACTIVITY', 'OTHER'];

const parseCommitment = (body: Record<string, unknown>) => {
  const kind = body.kind as CommitmentKind;
  if (!KINDS.includes(kind)) throw badRequest('kind must be SCHOOL, ACTIVITY or OTHER.');
  const name = str(body, 'name', { required: kind !== 'SCHOOL', max: 60 }) ?? 'School';
  const dayOfWeekVal = int(body.dayOfWeek, 'dayOfWeek', 0, 6);
  const startTime = str(body, 'startTime', { required: true })!;
  const endTime = str(body, 'endTime', { required: true })!;
  if (!isValidTime(startTime) || !isValidTime(endTime)) throw badRequest('Times must be in HH:MM format.');
  if (toMinutes(endTime) <= toMinutes(startTime)) throw badRequest('End time must be after start time.');
  const practiceMinutes =
    body.practiceMinutes === undefined || body.practiceMinutes === null || body.practiceMinutes === ''
      ? null
      : int(Number(body.practiceMinutes), 'practiceMinutes', 0, 180);
  return { kind, name, dayOfWeek: dayOfWeekVal, startTime, endTime, practiceMinutes: kind === 'ACTIVITY' ? practiceMinutes : null };
};

/** Overlapping commitments are allowed but reported back as conflicts so the UI can warn. */
const findConflicts = async (studentId: string, c: { dayOfWeek: number; startTime: string; endTime: string }, excludeId?: string) => {
  const sameDay = await prisma.commitment.findMany({ where: { studentId, dayOfWeek: c.dayOfWeek, NOT: excludeId ? { id: excludeId } : undefined } });
  return sameDay.filter((o) => overlaps(toMinutes(c.startTime), toMinutes(c.endTime), toMinutes(o.startTime), toMinutes(o.endTime)));
};

plannerRouter.get(
  '/commitments',
  ah(async (_req, res) => {
    const commitments = await prisma.commitment.findMany({ where: { studentId: sid(res) }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
    res.json({ commitments });
  }),
);

/** Replace all commitments at once (used by the onboarding form). */
plannerRouter.put(
  '/commitments',
  ah(async (req, res) => {
    if (!Array.isArray(req.body.commitments)) throw badRequest('commitments must be a list.');
    const parsed = req.body.commitments.map(parseCommitment);
    await prisma.$transaction([
      prisma.commitment.deleteMany({ where: { studentId: sid(res) } }),
      prisma.commitment.createMany({ data: parsed.map((c: ReturnType<typeof parseCommitment>) => ({ ...c, studentId: sid(res) })) }),
    ]);
    await syncActivityHabits(sid(res));
    const commitments = await prisma.commitment.findMany({ where: { studentId: sid(res) }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
    res.json({ commitments });
  }),
);

plannerRouter.post(
  '/commitments',
  ah(async (req, res) => {
    const data = parseCommitment(req.body);
    const conflicts = await findConflicts(sid(res), data);
    const commitment = await prisma.commitment.create({ data: { ...data, studentId: sid(res) } });
    await syncActivityHabits(sid(res));
    res.status(201).json({ commitment, conflicts });
  }),
);

plannerRouter.put(
  '/commitments/:id',
  ah(async (req, res) => {
    const existing = await prisma.commitment.findFirst({ where: { id: req.params.id, studentId: sid(res) } });
    if (!existing) throw notFound('Commitment not found.');
    const data = parseCommitment(req.body);
    const conflicts = await findConflicts(sid(res), data, existing.id);
    const commitment = await prisma.commitment.update({ where: { id: existing.id }, data });
    await syncActivityHabits(sid(res));
    res.json({ commitment, conflicts });
  }),
);

plannerRouter.delete(
  '/commitments/:id',
  ah(async (req, res) => {
    await prisma.commitment.deleteMany({ where: { id: req.params.id, studentId: sid(res) } });
    await syncActivityHabits(sid(res));
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Habits (FR6)
// ---------------------------------------------------------------------------

plannerRouter.get(
  '/habits',
  ah(async (_req, res) => {
    const habits = await prisma.habit.findMany({ where: { studentId: sid(res) }, orderBy: { createdAt: 'asc' } });
    res.json({ habits });
  }),
);

plannerRouter.post(
  '/habits',
  ah(async (req, res) => {
    const name = str(req.body, 'name', { required: true, max: 60 })!;
    const minutes = int(Number(req.body.minutes ?? 15), 'minutes', 1, 240);
    const habit = await prisma.habit.upsert({
      where: { studentId_name: { studentId: sid(res), name } },
      update: { minutes, active: true },
      create: { studentId: sid(res), name, minutes, source: 'custom' },
    });
    res.status(201).json({ habit });
  }),
);

plannerRouter.patch(
  '/habits/:id',
  ah(async (req, res) => {
    const habit = await prisma.habit.findFirst({ where: { id: req.params.id, studentId: sid(res) } });
    if (!habit) throw notFound('Habit not found.');
    const data: Prisma.HabitUpdateInput = {};
    if (req.body.minutes !== undefined) data.minutes = int(Number(req.body.minutes), 'minutes', 1, 240);
    if (req.body.active !== undefined) data.active = Boolean(req.body.active);
    if (req.body.name !== undefined) data.name = str(req.body, 'name', { required: true, max: 60 });
    res.json({ habit: await prisma.habit.update({ where: { id: habit.id }, data }) });
  }),
);

/** Tick / untick a habit for a day. */
plannerRouter.post(
  '/habits/:id/log',
  ah(async (req, res) => {
    const habit = await prisma.habit.findFirst({ where: { id: req.params.id, studentId: sid(res) } });
    if (!habit) throw notFound('Habit not found.');
    const date = today(req.body.date);
    if (date > todayLocal(new Date(Date.now() + 36 * 3600 * 1000))) throw badRequest('You cannot complete a habit in the future.');
    const completed = req.body.completed !== false;
    const log = await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: habit.id, date } },
      update: { completed, completedAt: completed ? new Date() : null },
      create: { habitId: habit.id, date, completed, completedAt: completed ? new Date() : null },
    });
    res.json({ log });
  }),
);

// ---------------------------------------------------------------------------
// Today's agenda – study blocks, commitments and habits in one list
// ---------------------------------------------------------------------------

plannerRouter.get(
  '/agenda',
  ah(async (req, res) => {
    const date = today(req.query.date);
    await ensureWeekGenerated(sid(res), startOfWeek(date), today(req.query.today ?? date));
    const [blocks, commitments, habits] = await Promise.all([
      prisma.studyBlock.findMany({ where: { studentId: sid(res), date }, orderBy: { startTime: 'asc' } }),
      prisma.commitment.findMany({ where: { studentId: sid(res), dayOfWeek: dayOfWeek(date) }, orderBy: { startTime: 'asc' } }),
      prisma.habit.findMany({ where: { studentId: sid(res), active: true }, include: { logs: { where: { date } } }, orderBy: { createdAt: 'asc' } }),
    ]);
    res.json({
      date,
      blocks: blocks.map((b) => ({ ...b, subjectLabel: SUBJECT_INFO[b.subject].label, emoji: SUBJECT_INFO[b.subject].emoji })),
      commitments,
      habits: habits.map(({ logs, ...h }) => ({ ...h, completed: logs.some((l) => l.completed) })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Timetable (FR3, FR4, FR5)
// ---------------------------------------------------------------------------

plannerRouter.get(
  '/schedule',
  ah(async (req, res) => {
    const t = today(req.query.today);
    const weekStart = startOfWeek(today(req.query.weekStart ?? t));
    await ensureWeekGenerated(sid(res), weekStart, t);
    const [blocks, commitments] = await Promise.all([
      prisma.studyBlock.findMany({ where: { studentId: sid(res), date: { gte: weekStart, lte: addDays(weekStart, 6) } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] }),
      prisma.commitment.findMany({ where: { studentId: sid(res) }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
    ]);
    res.json({ weekStart, blocks, commitments, settings: mergeSettings(res.locals.student!.settings) });
  }),
);

plannerRouter.post(
  '/schedule/generate',
  ah(async (req, res) => {
    const t = today(req.body.today);
    const weekStart = startOfWeek(today(req.body.weekStart ?? t));
    const out = await regenerateWeek(sid(res), weekStart, t);
    res.json({ weekStart, generated: out.blocks.length, skippedDays: out.skippedDays, priorities: out.priorities });
  }),
);

const parseBlock = (body: Record<string, unknown>, partial = false) => {
  const out: { date?: string; startTime?: string; endTime?: string; subject?: 'MATHS' | 'ENGLISH' | 'VERBAL' | 'QUANTITATIVE'; topic?: string | null } = {};
  if (!partial || body.date !== undefined) {
    if (!isValidDate(body.date)) throw badRequest('date must be YYYY-MM-DD.');
    out.date = body.date;
  }
  if (!partial || body.startTime !== undefined) {
    if (!isValidTime(body.startTime)) throw badRequest('startTime must be HH:MM.');
    out.startTime = body.startTime;
  }
  if (!partial || body.endTime !== undefined) {
    if (!isValidTime(body.endTime)) throw badRequest('endTime must be HH:MM.');
    out.endTime = body.endTime;
  }
  if (!partial || body.subject !== undefined) {
    if (!isSubject(body.subject)) throw badRequest('subject must be MATHS, ENGLISH, VERBAL or QUANTITATIVE.');
    out.subject = body.subject;
  }
  if (body.topic !== undefined) out.topic = body.topic ? String(body.topic).slice(0, 80) : null;
  return out;
};

/** Report clashes with commitments or other blocks (shown as warnings, not blocked). */
const blockConflicts = async (studentId: string, b: { id?: string; date: string; startTime: string; endTime: string }) => {
  if (toMinutes(b.endTime) <= toMinutes(b.startTime)) throw badRequest('End time must be after start time.');
  const [commitments, blocks] = await Promise.all([
    prisma.commitment.findMany({ where: { studentId, dayOfWeek: dayOfWeek(b.date) } }),
    prisma.studyBlock.findMany({ where: { studentId, date: b.date, NOT: b.id ? { id: b.id } : undefined } }),
  ]);
  const s = toMinutes(b.startTime);
  const e = toMinutes(b.endTime);
  return [
    ...commitments.filter((c) => overlaps(s, e, toMinutes(c.startTime), toMinutes(c.endTime))).map((c) => `Clashes with ${c.name} (${c.startTime}-${c.endTime})`),
    ...blocks.filter((o) => overlaps(s, e, toMinutes(o.startTime), toMinutes(o.endTime))).map((o) => `Overlaps ${SUBJECT_INFO[o.subject].label} block (${o.startTime}-${o.endTime})`),
  ];
};

plannerRouter.post(
  '/schedule/blocks',
  ah(async (req, res) => {
    const data = parseBlock(req.body) as Required<Omit<ReturnType<typeof parseBlock>, 'topic'>> & { topic?: string | null };
    const warnings = await blockConflicts(sid(res), data);
    const block = await prisma.studyBlock.create({ data: { ...data, studentId: sid(res), isManual: true } });
    res.status(201).json({ block, warnings });
  }),
);

plannerRouter.patch(
  '/schedule/blocks/:id',
  ah(async (req, res) => {
    const existing = await prisma.studyBlock.findFirst({ where: { id: req.params.id, studentId: sid(res) } });
    if (!existing) throw notFound('Study block not found.');
    const changes = parseBlock(req.body, true);
    const data: Prisma.StudyBlockUpdateInput = { ...changes };
    let warnings: string[] = [];
    if (Object.keys(changes).length) {
      data.isManual = true; // an edited block is kept when the timetable is regenerated
      warnings = await blockConflicts(sid(res), { ...existing, ...changes, id: existing.id });
    }
    if (req.body.completed !== undefined) {
      data.completed = Boolean(req.body.completed);
      data.completedAt = data.completed ? new Date() : null;
    }
    const block = await prisma.studyBlock.update({ where: { id: existing.id }, data });
    res.json({ block, warnings });
  }),
);

plannerRouter.delete(
  '/schedule/blocks/:id',
  ah(async (req, res) => {
    await prisma.studyBlock.deleteMany({ where: { id: req.params.id, studentId: sid(res) } });
    res.status(204).end();
  }),
);
