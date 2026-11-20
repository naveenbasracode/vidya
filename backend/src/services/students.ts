// Student-level services shared by several routes.
import type { Prisma, Subject } from '@prisma/client';
import { prisma } from '../db.js';
import { subjectAverages, weeklySummary, statusFor } from '../domain/achievements.js';
import { generateSchedule, mergeSettings } from '../domain/scheduler.js';
import { SUBJECT_INFO } from '../domain/types.js';
import { addDays, startOfWeek, weekDates, todayLocal } from '../lib/dates.js';

const dayOf = (d: Date) => todayLocal(d);

/** Default habits for a new student (FR6: "everyday reading of 15 mins"). */
export const createDefaultHabits = async (studentId: string) => {
  await prisma.habit.upsert({
    where: { studentId_name: { studentId, name: 'Reading' } },
    update: {},
    create: { studentId, name: 'Reading', minutes: 15, source: 'default' },
  });
};

/**
 * Keep "<activity> practice" habits in step with the student's co-curricular activities:
 * e.g. Karate (practice 15 min) → daily habit "Karate practice – 15 min".
 */
export const syncActivityHabits = async (studentId: string) => {
  const commitments = await prisma.commitment.findMany({ where: { studentId, kind: 'ACTIVITY' } });
  const wanted = new Map<string, number>();
  for (const c of commitments) {
    if (c.practiceMinutes && c.practiceMinutes > 0) {
      const name = `${c.name.trim()} practice`;
      wanted.set(name, Math.max(wanted.get(name) ?? 0, c.practiceMinutes));
    }
  }
  const existing = await prisma.habit.findMany({ where: { studentId, source: 'activity' } });
  for (const [name, minutes] of wanted) {
    await prisma.habit.upsert({
      where: { studentId_name: { studentId, name } },
      update: { minutes, active: true },
      create: { studentId, name, minutes, source: 'activity' },
    });
  }
  for (const h of existing) {
    if (!wanted.has(h.name) && h.active) await prisma.habit.update({ where: { id: h.id }, data: { active: false } });
  }
};

/** Recent performance per subject (last 5 graded results). */
export const getSubjectAverages = async (studentId: string) => {
  const scores = await prisma.score.findMany({ where: { studentId }, orderBy: { createdAt: 'asc' } });
  return subjectAverages(scores.map((s) => ({ subject: s.subject, score: s.score, date: dayOf(s.createdAt) })));
};

/**
 * (Re)generate the study timetable for a week. Manual blocks and completed blocks are kept;
 * other future blocks are replaced. Blocks before `fromDate` (today) are left untouched.
 */
export const regenerateWeek = async (studentId: string, weekStart: string, fromDate: string) => {
  const student = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
  const settings = mergeSettings(student.settings);
  const days = weekDates(weekStart);
  const from = fromDate > weekStart ? fromDate : weekStart;

  await prisma.studyBlock.deleteMany({
    where: { studentId, date: { gte: from, lte: days[6] }, isManual: false, completed: false },
  });
  const kept = await prisma.studyBlock.findMany({ where: { studentId, date: { gte: from, lte: days[6] } } });
  const commitments = await prisma.commitment.findMany({ where: { studentId } });
  const subjectScores = await getSubjectAverages(studentId);

  const out = generateSchedule({
    weekStart,
    commitments,
    fixedBlocks: kept,
    subjectScores,
    settings,
    fromDate: from,
  });
  if (out.blocks.length) {
    await prisma.studyBlock.createMany({ data: out.blocks.map((b) => ({ ...b, studentId })) });
  }
  return out;
};

/**
 * After a new graded result, re-plan the rest of this week (from tomorrow) so the weakest
 * subjects come first. Today's blocks and hand-edited or completed blocks are left alone.
 * On Sunday there is nothing left to re-plan; next week is planned when it is first viewed.
 */
export const replanAfterScore = async (studentId: string, today: string = todayLocal()) => {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student?.onboarded) return null;
  const weekStart = startOfWeek(today);
  const tomorrow = addDays(today, 1);
  if (tomorrow > addDays(weekStart, 6)) return null;
  return regenerateWeek(studentId, weekStart, tomorrow);
};

/** Ensure a week has a timetable; generate it the first time the week is viewed. */
export const ensureWeekGenerated = async (studentId: string, weekStart: string, today: string) => {
  const end = addDays(weekStart, 6);
  if (end < today) return; // never back-fill past weeks
  const count = await prisma.studyBlock.count({ where: { studentId, date: { gte: weekStart, lte: end } } });
  if (count === 0) {
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (student?.onboarded) await regenerateWeek(studentId, weekStart, today);
  }
};

export const getWeeklySummary = async (studentId: string, weekStart: string, today: string) => {
  const weekEnd = addDays(weekStart, 6);
  const [scores, habits, habitLogs, studyBlocks] = await Promise.all([
    prisma.score.findMany({
      where: { studentId, createdAt: { gte: new Date(`${addDays(weekStart, -1)}T00:00:00Z`), lte: new Date(`${addDays(weekEnd, 1)}T23:59:59Z`) } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.habit.findMany({ where: { studentId } }),
    prisma.habitLog.findMany({ where: { habit: { studentId }, date: { gte: weekStart, lte: weekEnd } } }),
    prisma.studyBlock.findMany({ where: { studentId, date: { gte: weekStart, lte: weekEnd } } }),
  ]);
  return weeklySummary({
    weekStart,
    today,
    scores: scores.map((s) => ({ subject: s.subject, score: s.score, date: dayOf(s.createdAt), kind: s.kind })),
    habits: habits.map((h) => ({ id: h.id, name: h.name, minutes: h.minutes, since: dayOf(h.createdAt), active: h.active })),
    habitLogs,
    studyBlocks,
  });
};

// ---------------------------------------------------------------------------
// Alerts (FR13)
// ---------------------------------------------------------------------------

type NewNotification = Omit<Prisma.NotificationCreateManyInput, 'studentId'>;

const notify = async (studentId: string, items: NewNotification[]) => {
  if (!items.length) return;
  await prisma.notification.createMany({ data: items.map((n) => ({ ...n, studentId })), skipDuplicates: true });
};

/** Called after every graded exam / practice / essay. */
export const alertOnScore = async (studentId: string, subject: Subject, score: number, label: string) => {
  if (statusFor(score) !== 'RED') return;
  await notify(studentId, [
    {
      type: 'LOW_SCORE',
      severity: 'error',
      message: `${SUBJECT_INFO[subject].emoji} ${label}: scored ${Math.round(score)}% (below 85%). Upcoming study blocks now give ${SUBJECT_INFO[subject].label} more time.`,
    },
  ]);
};

/**
 * Checks for missed activities on the previous day and a red weekly status for last week.
 * Uses dedupe keys, so it is safe to call on every dashboard load.
 */
export const runAlertChecks = async (studentId: string, today: string) => {
  const yesterday = addDays(today, -1);
  const items: NewNotification[] = [];

  const habits = await prisma.habit.findMany({
    where: { studentId, active: true },
    include: { logs: { where: { date: yesterday } } },
  });
  for (const h of habits) {
    if (dayOf(h.createdAt) > yesterday) continue;
    if (!h.logs.some((l) => l.completed)) {
      items.push({
        type: 'MISSED_HABIT',
        severity: 'warning',
        message: `⏰ "${h.name}" (${h.minutes} min) was not completed yesterday (${yesterday}).`,
        dedupeKey: `missed-habit:${h.id}:${yesterday}`,
      });
    }
  }

  const missedBlocks = await prisma.studyBlock.findMany({ where: { studentId, date: yesterday, completed: false } });
  if (missedBlocks.length) {
    items.push({
      type: 'MISSED_STUDY',
      severity: 'warning',
      message: `📅 ${missedBlocks.length} study block${missedBlocks.length > 1 ? 's were' : ' was'} missed yesterday: ${missedBlocks
        .map((b) => `${SUBJECT_INFO[b.subject].label} ${b.startTime}`)
        .join(', ')}.`,
      dedupeKey: `missed-study:${studentId}:${yesterday}`,
    });
  }

  const lastWeek = addDays(startOfWeek(today), -7);
  const summary = await getWeeklySummary(studentId, lastWeek, today);
  if (summary.academic.status === 'RED') {
    items.push({
      type: 'WEEKLY_RED',
      severity: 'error',
      message: `🔴 Last week's academic achievement was ${summary.academic.percent}% (Red). Focus areas: ${summary.focusAreas
        .map((s) => SUBJECT_INFO[s].label)
        .join(', ') || 'see dashboard'}.`,
      dedupeKey: `weekly-red:${studentId}:${lastWeek}`,
    });
  }
  if (summary.activity.status === 'RED') {
    items.push({
      type: 'WEEKLY_RED',
      severity: 'warning',
      message: `🟠 Last week only ${summary.activity.percent}% of daily habits and study blocks were completed.`,
      dedupeKey: `weekly-activity-red:${studentId}:${lastWeek}`,
    });
  }
  await notify(studentId, items);
};
