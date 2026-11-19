// Priority-based, conflict-free study timetable generator (FR3, FR4).
import type { Subject } from './types.js';
import { SUBJECTS, SUBJECT_INFO } from './types.js';
import { dayOfWeek, fromMinutes, overlaps, toMinutes, weekDates, DAY_NAMES } from '../lib/dates.js';

export interface TimeWindow {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface SchedulerSettings {
  weekdayWindow: TimeWindow;
  weekendWindow: TimeWindow;
  blockMinutes: number;
  breakMinutes: number;
  maxBlocksWeekday: number;
  maxBlocksWeekend: number;
  /** When true, no study is scheduled on a day that has a co-curricular activity. */
  skipActivityDays: boolean;
  /** Days of week (0=Sun) on which study may be scheduled. */
  studyDays: number[];
}

export const DEFAULT_SETTINGS: SchedulerSettings = {
  weekdayWindow: { start: '16:00', end: '20:00' },
  weekendWindow: { start: '09:00', end: '17:00' },
  blockMinutes: 30,
  breakMinutes: 15,
  maxBlocksWeekday: 2,
  maxBlocksWeekend: 3,
  skipActivityDays: true,
  studyDays: [0, 1, 2, 3, 4, 5, 6],
};

export const mergeSettings = (raw: unknown): SchedulerSettings => {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<SchedulerSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    weekdayWindow: { ...DEFAULT_SETTINGS.weekdayWindow, ...(s.weekdayWindow ?? {}) },
    weekendWindow: { ...DEFAULT_SETTINGS.weekendWindow, ...(s.weekendWindow ?? {}) },
    studyDays: Array.isArray(s.studyDays) ? s.studyDays : DEFAULT_SETTINGS.studyDays,
  };
};

export interface CommitmentInput {
  kind: 'SCHOOL' | 'ACTIVITY' | 'OTHER';
  name: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface FixedBlock {
  date: string;
  startTime: string;
  endTime: string;
}

export interface GeneratedBlock {
  date: string;
  startTime: string;
  endTime: string;
  subject: Subject;
}

export interface ScheduleInput {
  weekStart: string;
  commitments: CommitmentInput[];
  /** Blocks that must be kept (manual edits) – generated blocks will not overlap them. */
  fixedBlocks?: FixedBlock[];
  /** Recent average score per subject; missing = no data yet. */
  subjectScores: Partial<Record<Subject, number>>;
  settings?: SchedulerSettings;
  /** Do not generate blocks before this date (e.g. today). */
  fromDate?: string;
}

export interface ScheduleOutput {
  blocks: GeneratedBlock[];
  skippedDays: { date: string; reason: string }[];
  priorities: { subject: Subject; score: number | null; need: number }[];
}

const UNKNOWN_SCORE = 70; // treat "no data yet" as needing a moderate amount of practice
const MIN_NEED = 5;

/** How much a subject needs study time: lower score → higher need. */
export const subjectNeed = (score: number | undefined) => Math.max(MIN_NEED, 100 - (score ?? UNKNOWN_SCORE));

/** Subjects ordered weakest first. */
export const prioritise = (scores: Partial<Record<Subject, number>>) =>
  SUBJECTS.map((subject, idx) => ({ subject, score: scores[subject] ?? null, need: subjectNeed(scores[subject]), idx })).sort(
    (a, b) => b.need - a.need || a.idx - b.idx,
  );

interface Interval {
  start: number;
  end: number;
}

/** Find up to `max` free study slots inside the window, avoiding busy intervals (+ buffer). */
export const findFreeSlots = (window: TimeWindow, busy: Interval[], blockMinutes: number, breakMinutes: number, max: number): Interval[] => {
  const slots: Interval[] = [];
  const winStart = toMinutes(window.start);
  const winEnd = toMinutes(window.end);
  const occupied = busy.map((b) => ({ start: b.start - breakMinutes, end: b.end + breakMinutes }));
  let t = winStart;
  while (t + blockMinutes <= winEnd && slots.length < max) {
    const candidate = { start: t, end: t + blockMinutes };
    const clash = occupied.find((o) => overlaps(candidate.start, candidate.end, o.start, o.end));
    if (clash) {
      // jump past the clash, rounded up to the next 5 minutes
      t = Math.max(t + 5, Math.ceil(clash.end / 5) * 5);
      continue;
    }
    slots.push(candidate);
    occupied.push({ start: candidate.start, end: candidate.end + breakMinutes });
    t = candidate.end + breakMinutes;
  }
  return slots;
};

export const generateSchedule = (input: ScheduleInput): ScheduleOutput => {
  const settings = input.settings ?? DEFAULT_SETTINGS;
  const fixed = input.fixedBlocks ?? [];
  const skippedDays: ScheduleOutput['skippedDays'] = [];

  // 1. Work out free slots per day.
  const daySlots: { date: string; slots: Interval[] }[] = [];
  for (const date of weekDates(input.weekStart)) {
    if (input.fromDate && date < input.fromDate) continue;
    const dow = dayOfWeek(date);
    const todays = input.commitments.filter((c) => c.dayOfWeek === dow);
    const activities = todays.filter((c) => c.kind === 'ACTIVITY');
    if (!settings.studyDays.includes(dow)) {
      skippedDays.push({ date, reason: `${DAY_NAMES[dow]} is a rest day` });
      continue;
    }
    if (settings.skipActivityDays && activities.length) {
      skippedDays.push({ date, reason: `${activities.map((a) => a.name).join(' & ')} day — no study scheduled` });
      continue;
    }
    const busy: Interval[] = [
      ...todays.map((c) => ({ start: toMinutes(c.startTime), end: toMinutes(c.endTime) })),
      ...fixed.filter((b) => b.date === date).map((b) => ({ start: toMinutes(b.startTime), end: toMinutes(b.endTime) })),
    ];
    const weekend = dow === 0 || dow === 6;
    const window = weekend ? settings.weekendWindow : settings.weekdayWindow;
    const alreadyFixed = fixed.filter((b) => b.date === date).length;
    const max = Math.max(0, (weekend ? settings.maxBlocksWeekend : settings.maxBlocksWeekday) - alreadyFixed);
    const slots = max ? findFreeSlots(window, busy, settings.blockMinutes, settings.breakMinutes, max) : [];
    if (!slots.length && max) skippedDays.push({ date, reason: 'No free time in the study window' });
    daySlots.push({ date, slots });
  }

  // 2. Allocate subjects to slots, weakest first (D'Hondt-style proportional allocation).
  const priorities = prioritise(input.subjectScores);
  const assigned: Record<Subject, number> = { MATHS: 0, ENGLISH: 0, VERBAL: 0, QUANTITATIVE: 0 };
  const totalSlots = daySlots.reduce((a, d) => a + d.slots.length, 0);
  let remaining = totalSlots;
  const blocks: GeneratedBlock[] = [];

  for (const { date, slots } of daySlots) {
    const usedToday = new Set<Subject>();
    for (const slot of slots) {
      const neverAssigned = priorities.filter((p) => assigned[p.subject] === 0);
      let choice: Subject;
      if (totalSlots >= SUBJECTS.length && neverAssigned.length && remaining <= neverAssigned.length) {
        // make sure every subject gets at least one block in the week
        choice = neverAssigned[0].subject;
      } else {
        const ranked = [...priorities].sort(
          (a, b) => b.need / (assigned[b.subject] + 1) - a.need / (assigned[a.subject] + 1) || b.need - a.need || a.idx - b.idx,
        );
        // avoid studying the same subject twice in one day when there is an alternative
        choice = (ranked.find((p) => !usedToday.has(p.subject)) ?? ranked[0]).subject;
      }
      assigned[choice] += 1;
      usedToday.add(choice);
      remaining -= 1;
      blocks.push({ date, startTime: fromMinutes(slot.start), endTime: fromMinutes(slot.end), subject: choice });
    }
  }

  return {
    blocks,
    skippedDays,
    priorities: priorities.map(({ subject, score, need }) => ({ subject, score, need })),
  };
};

export const describeBlock = (b: GeneratedBlock) => `${SUBJECT_INFO[b.subject].label} ${b.startTime}-${b.endTime}`;
