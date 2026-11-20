export const SUBJECTS = {
  MATHS: { label: 'Maths', emoji: '🔢', color: '#0f62fe' },
  ENGLISH: { label: 'English', emoji: '📚', color: '#8a3ffc' },
  VERBAL: { label: 'Verbal Reasoning', emoji: '🧩', color: '#007d79' },
  QUANTITATIVE: { label: 'Quantitative Reasoning', emoji: '📊', color: '#d12771' },
};
export const SUBJECT_KEYS = Object.keys(SUBJECTS);

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Today's date (YYYY-MM-DD) in the browser's timezone. */
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const dayOfWeek = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

export const startOfWeek = (date) => {
  const dow = dayOfWeek(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow);
};

export const prettyDate = (date, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });

/** "16:30" → "4:30 pm" */
export const prettyTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const fromMinutes = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export const STATUS = {
  GREEN: { label: 'Green', emoji: '🟢', text: 'On track!', className: 'status--green' },
  AMBER: { label: 'Amber', emoji: '🟠', text: 'Nearly there', className: 'status--amber' },
  RED: { label: 'Red', emoji: '🔴', text: 'Needs focus', className: 'status--red' },
};

export const statusFor = (pct) => (pct === null || pct === undefined ? null : pct >= 95 ? 'GREEN' : pct >= 85 ? 'AMBER' : 'RED');

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
