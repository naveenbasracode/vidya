// Calendar helpers working on "YYYY-MM-DD" day strings and "HH:MM" time strings.
// All arithmetic is done in UTC on the day string so results never shift with timezones.

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidDate = (s: unknown): s is string =>
  typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export const isValidTime = (s: unknown): s is string => typeof s === 'string' && TIME_RE.test(s);

/** Today's date in the server's local timezone (the app runs on the family's own computer). */
export const todayLocal = (now: Date = new Date()): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** 0 = Sunday ... 6 = Saturday */
export const dayOfWeek = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

/** Weeks run Monday to Sunday. */
export const startOfWeek = (date: string): string => {
  const dow = dayOfWeek(date);
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(date, diff);
};

export const weekDates = (weekStart: string): string[] =>
  Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

/** True when [aStart, aEnd) overlaps [bStart, bEnd) (minutes). */
export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && bStart < aEnd;
