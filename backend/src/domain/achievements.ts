// Weekly achievement calculation (FR12, NFR4): Green >= 95%, Amber 85-94%, Red < 85%.
import type { Status, Subject } from './types.js';
import { SUBJECTS } from './types.js';
import { addDays, weekDates } from '../lib/dates.js';

export const GREEN_MIN = 95;
export const AMBER_MIN = 85;

export const statusFor = (percent: number): Status => (percent >= GREEN_MIN ? 'GREEN' : percent >= AMBER_MIN ? 'AMBER' : 'RED');

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface ScoreInput {
  subject: Subject;
  score: number;
  /** "YYYY-MM-DD" */
  date: string;
  kind?: string;
}

/** Average of the most recent `recent` scores per subject (scores must be ordered oldest→newest). */
export const subjectAverages = (scores: ScoreInput[], recent = 5): Partial<Record<Subject, number>> => {
  const out: Partial<Record<Subject, number>> = {};
  for (const subject of SUBJECTS) {
    const list = scores.filter((s) => s.subject === subject).slice(-recent);
    if (list.length) out[subject] = round1(list.reduce((a, s) => a + s.score, 0) / list.length);
  }
  return out;
};

export interface HabitInput {
  id: string;
  name: string;
  minutes: number;
  /** first day the habit applies ("YYYY-MM-DD") */
  since: string;
  active: boolean;
}

export interface WeeklyInput {
  weekStart: string;
  today: string;
  scores: ScoreInput[];
  habits: HabitInput[];
  habitLogs: { habitId: string; date: string; completed: boolean }[];
  studyBlocks: { date: string; completed: boolean }[];
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  academic: {
    percent: number | null;
    status: Status | null;
    attempts: number;
    bySubject: { subject: Subject; percent: number | null; status: Status | null; attempts: number }[];
  };
  activity: {
    percent: number | null;
    status: Status | null;
    done: number;
    expected: number;
    habits: { id: string; name: string; minutes: number; done: number; expected: number }[];
    study: { done: number; expected: number };
  };
  strengths: Subject[];
  focusAreas: Subject[];
}

export const weeklySummary = (input: WeeklyInput): WeeklySummary => {
  const days = weekDates(input.weekStart);
  const weekEnd = days[6];
  const inWeek = (d: string) => d >= input.weekStart && d <= weekEnd;
  // Only days that have already happened (including today) count towards expected activities.
  const elapsed = days.filter((d) => d <= input.today);

  // Academic: all graded work this week
  const weekScores = input.scores.filter((s) => inWeek(s.date));
  const bySubject = SUBJECTS.map((subject) => {
    const list = weekScores.filter((s) => s.subject === subject);
    const percent = list.length ? round1(list.reduce((a, s) => a + s.score, 0) / list.length) : null;
    return { subject, percent, status: percent === null ? null : statusFor(percent), attempts: list.length };
  });
  const academicPercent = weekScores.length ? round1(weekScores.reduce((a, s) => a + s.score, 0) / weekScores.length) : null;

  // Activity: daily habits + scheduled study blocks
  const habits = input.habits
    .filter((h) => h.active)
    .map((h) => {
      const applicable = elapsed.filter((d) => d >= h.since);
      const done = input.habitLogs.filter((l) => l.habitId === h.id && l.completed && inWeek(l.date)).length;
      return { id: h.id, name: h.name, minutes: h.minutes, done: Math.min(done, applicable.length), expected: applicable.length };
    });
  const blocks = input.studyBlocks.filter((b) => inWeek(b.date) && b.date <= input.today);
  const study = { done: blocks.filter((b) => b.completed).length, expected: blocks.length };
  const done = habits.reduce((a, h) => a + Math.min(h.done, h.expected), 0) + study.done;
  const expected = habits.reduce((a, h) => a + h.expected, 0) + study.expected;
  const activityPercent = expected ? round1((done / expected) * 100) : null;

  // Strengths / focus areas use the week's results, falling back to nothing when no data.
  const graded = bySubject.filter((s) => s.percent !== null) as { subject: Subject; percent: number }[];
  const strengths = graded.filter((s) => s.percent >= AMBER_MIN).sort((a, b) => b.percent - a.percent).map((s) => s.subject);
  const focusAreas = graded.filter((s) => s.percent < AMBER_MIN).sort((a, b) => a.percent - b.percent).map((s) => s.subject);

  return {
    weekStart: input.weekStart,
    weekEnd,
    academic: {
      percent: academicPercent,
      status: academicPercent === null ? null : statusFor(academicPercent),
      attempts: weekScores.length,
      bySubject,
    },
    activity: {
      percent: activityPercent,
      status: activityPercent === null ? null : statusFor(activityPercent),
      done,
      expected,
      habits,
      study,
    },
    strengths,
    focusAreas,
  };
};

export const previousWeeks = (weekStart: string, n: number) => Array.from({ length: n }, (_, i) => addDays(weekStart, -7 * (n - 1 - i)));
