// API integration tests: the real Express app + Prisma against a PostgreSQL TEST database.
// Run with `npm run test:api` (see scripts/test-api.sh) — never against your real data.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { ensureDefaultExams } from '../../src/routes/admin.js';
import { addDays, startOfWeek, todayLocal } from '../../src/lib/dates.js';

if (!/test/i.test(process.env.DATABASE_URL ?? '')) {
  throw new Error('Refusing to run: DATABASE_URL must point at a test database (its name must contain "test"). Use `npm run test:api`.');
}

let server: Server;
let base = '';

const call = async (method: string, path: string, body?: unknown, token?: string) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
};

const ok = async (method: string, path: string, body?: unknown, token?: string) => {
  const r = await call(method, path, body, token);
  if (r.status >= 300) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
};

// Dates relative to the current week so the suite works whenever it is run.
const MON = startOfWeek(todayLocal());
const TUE = addDays(MON, 1);
const WED = addDays(MON, 2);

// Shared state across the ordered tests below
const s: Record<string, any> = {};

before(async () => {
  await ensureDefaultExams();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  server?.close();
  await prisma.$disconnect();
});

test('health check', async () => {
  assert.deepEqual(await ok('GET', '/health'), { ok: true });
});

test('register parent and student (linked); duplicates and admin self-registration rejected', async () => {
  const p = await ok('POST', '/auth/register', { name: 'Mum', email: 'mum@test.local', password: 'secret1', role: 'PARENT' });
  assert.equal(p.user.role, 'PARENT');
  s.pt = p.token;
  const st = await ok('POST', '/auth/register', { name: 'Kid', email: 'Kid@Test.local', password: 'secret1', role: 'STUDENT', grade: 6, parentEmail: 'mum@test.local' });
  assert.equal(st.user.onboarded, false);
  assert.equal((await call('POST', '/auth/register', { name: 'X', email: 'kid@test.local', password: 'secret1' })).status, 409);
  assert.equal((await call('POST', '/auth/register', { name: 'X', email: 'a@test.local', password: 'pw', role: 'ADMIN' })).status, 400);
  assert.equal((await call('POST', '/auth/register', { name: 'X', email: 'short@test.local', password: '123' })).status, 400);
});

test('login is case-insensitive; wrong password is 401; /me returns the user', async () => {
  assert.equal((await call('POST', '/auth/login', { email: 'kid@test.local', password: 'nope' })).status, 401);
  const login = await ok('POST', '/auth/login', { email: 'KID@test.local', password: 'secret1' });
  s.st = login.token;
  assert.equal((await ok('GET', '/auth/me', undefined, s.st)).user.email, 'kid@test.local');
});

test('onboarding saves commitments; invalid times rejected; overlaps reported', async () => {
  const commitments = [
    ...[1, 2, 3, 4, 5].map((d) => ({ kind: 'SCHOOL', name: 'School', dayOfWeek: d, startTime: '08:30', endTime: '15:30' })),
    { kind: 'ACTIVITY', name: 'Drums', dayOfWeek: 3, startTime: '18:00', endTime: '19:00', practiceMinutes: 15 },
    { kind: 'ACTIVITY', name: 'Karate', dayOfWeek: 1, startTime: '16:30', endTime: '17:30', practiceMinutes: 15 },
  ];
  assert.equal((await ok('PUT', '/students/me/commitments', { commitments }, s.st)).commitments.length, 7);
  assert.equal((await call('POST', '/students/me/commitments', { kind: 'ACTIVITY', name: 'Bad', dayOfWeek: 2, startTime: '18:00', endTime: '17:00' }, s.st)).status, 400);
  const c = await ok('POST', '/students/me/commitments', { kind: 'ACTIVITY', name: 'Chess', dayOfWeek: 3, startTime: '18:30', endTime: '19:30' }, s.st);
  assert.equal(c.conflicts.length, 1);
  await ok('DELETE', `/students/me/commitments/${c.commitment.id}`, undefined, s.st);
});

test('finishing onboarding builds a timetable with no study on activity days', async () => {
  const onb = await ok('PATCH', '/students/me', { onboarded: true, today: MON }, s.st);
  assert.ok(onb.schedule.blocks.length > 0);
  const sched = await ok('GET', `/students/me/schedule?weekStart=${MON}&today=${MON}`, undefined, s.st);
  assert.ok(sched.blocks.length > 0);
  assert.ok(sched.blocks.every((b: any) => b.date !== MON && b.date !== WED), 'no study on Karate (Mon) or Drums (Wed) days');
  for (const b of sched.blocks) {
    const dow = new Date(`${b.date}T00:00:00Z`).getUTCDay();
    if (dow >= 1 && dow <= 5) assert.ok(b.startTime >= '15:45', `block ${b.date} ${b.startTime} overlaps school`);
  }
});

test('agenda lists habits synced from activities; habits and blocks can be ticked', async () => {
  const kid = await prisma.user.findUniqueOrThrow({ where: { email: 'kid@test.local' } });
  s.kidId = kid.id;
  // Pretend the habits have existed for a while (so "missed yesterday" alerts can fire)
  await prisma.habit.updateMany({ where: { studentId: kid.id }, data: { createdAt: new Date(`${addDays(MON, -14)}T00:00:00Z`) } });
  const agenda = await ok('GET', `/students/me/agenda?date=${TUE}&today=${TUE}`, undefined, s.st);
  assert.deepEqual(agenda.habits.map((h: any) => h.name).sort(), ['Drums practice', 'Karate practice', 'Reading']);
  assert.ok(agenda.blocks.length >= 1);
  const reading = agenda.habits.find((h: any) => h.name === 'Reading');
  await ok('POST', `/students/me/habits/${reading.id}/log`, { date: TUE, completed: true }, s.st);
  await ok('PATCH', `/students/me/schedule/blocks/${agenda.blocks[0].id}`, { completed: true }, s.st);
  const again = await ok('GET', `/students/me/agenda?date=${TUE}&today=${TUE}`, undefined, s.st);
  assert.equal(again.habits.find((h: any) => h.name === 'Reading').completed, true);
  assert.equal(again.blocks.find((b: any) => b.id === agenda.blocks[0].id).completed, true);
});

test('practice: answers hidden, graded on submit, cannot resubmit, topic must match subject', async () => {
  const topics = await ok('GET', '/students/me/practice/topics', undefined, s.st);
  assert.equal(topics.subjects.length, 4);
  const ps = await ok('POST', '/students/me/practice', { subject: 'MATHS', topicId: 'percentages', count: 5 }, s.st);
  assert.equal(ps.set.questions.length, 5);
  assert.ok(ps.set.questions.every((q: any) => q.answer === undefined));
  assert.equal((await ok('POST', `/students/me/practice/${ps.set.id}/submit`, { answers: {} }, s.st)).set.score, 0);
  assert.equal((await call('POST', `/students/me/practice/${ps.set.id}/submit`, { answers: {} }, s.st)).status, 400);
  assert.equal((await call('POST', '/students/me/practice', { subject: 'MATHS', topicId: 'synonyms' }, s.st)).status, 400);

  const ps2 = await ok('POST', '/students/me/practice', { subject: 'ENGLISH', topicId: 'vocabulary', count: 4 }, s.st);
  const stored = await prisma.practiceSet.findUniqueOrThrow({ where: { id: ps2.set.id } });
  const answers = Object.fromEntries((stored.questions as any[]).map((q) => [q.id, q.answer]));
  assert.equal((await ok('POST', `/students/me/practice/${ps2.set.id}/submit`, { answers }, s.st)).set.score, 100);
});

test('essay practice returns a score and feedback', async () => {
  const es = await ok('POST', '/students/me/practice', { subject: 'ENGLISH', topicId: 'essay-writing' }, s.st);
  assert.equal(es.set.questions[0].type, 'essay');
  const g = await ok('POST', `/students/me/practice/${es.set.id}/submit`, { answers: { q1: 'I like it. It is fun.' } }, s.st);
  assert.ok(g.set.score < 50);
  assert.ok(g.set.result.results[0].feedback.length > 0);
});

test('exams: four 45-minute exams; start/resume; only the student can sit; graded', async () => {
  const ex = await ok('GET', '/students/me/exams', undefined, s.st);
  assert.equal(ex.exams.length, 4);
  assert.ok(ex.exams.every((e: any) => e.durationMinutes === 45 && e.questionCount === 20));
  const start = await ok('POST', `/students/me/exams/${ex.exams[0].id}/start`, {}, s.st);
  assert.equal(new Date(start.attempt.deadline).getTime() - new Date(start.attempt.startedAt).getTime(), 45 * 60_000);
  assert.equal((await ok('POST', `/students/me/exams/${ex.exams[0].id}/start`, {}, s.st)).attempt.id, start.attempt.id);
  assert.equal((await call('POST', `/students/me/exams/${ex.exams[0].id}/start`, {}, s.pt)).status, 403);
  const exam = await prisma.exam.findUniqueOrThrow({ where: { id: ex.exams[0].id } });
  const answers = Object.fromEntries((exam.questions as any[]).map((q, i) => [q.id, i < 18 ? q.answer : 'wrong']));
  const sub = await ok('POST', `/students/me/exams/attempts/${start.attempt.id}/submit`, { answers }, s.st);
  assert.equal(sub.attempt.score, 90);
  assert.equal(sub.attempt.timedOut, false);
  assert.equal((await ok('GET', '/students/me/exams', undefined, s.st)).exams[0].bestScore, 90);

  const start2 = await ok('POST', `/students/me/exams/${ex.exams[1].id}/start`, {}, s.st);
  await prisma.examAttempt.update({ where: { id: start2.attempt.id }, data: { startedAt: new Date(Date.now() - 50 * 60_000) } });
  const late = await ok('POST', `/students/me/exams/attempts/${start2.attempt.id}/submit`, { answers: {} }, s.st);
  assert.equal(late.attempt.timedOut, true);
});

test('achievements: weekly statuses, history and a 90% exam shown as Amber', async () => {
  const ach = await ok('GET', `/students/me/achievements?today=${WED}`, undefined, s.st);
  assert.ok(['GREEN', 'AMBER', 'RED'].includes(ach.summary.academic.status));
  assert.equal(ach.history.length, 6);
  assert.equal(ach.summary.activity.habits.length, 3);
  assert.equal(ach.recent.find((r: any) => r.kind === 'EXAM' && r.score === 90).status, 'AMBER');
});

test('alerts: low score and missed habit fire once; mark all read', async () => {
  const notes = await ok('GET', `/students/me/notifications?today=${WED}`, undefined, s.st);
  const types = notes.notifications.map((n: any) => n.type);
  assert.ok(types.includes('LOW_SCORE'));
  assert.ok(types.includes('MISSED_HABIT'));
  assert.equal((await ok('GET', `/students/me/notifications?today=${WED}`, undefined, s.st)).notifications.length, notes.notifications.length);
  await ok('POST', '/students/me/notifications/read-all', {}, s.st);
  assert.equal((await ok('GET', `/students/me/notifications?today=${WED}`, undefined, s.st)).unread, 0);
});

test('roadmap marks mastered topics for the current grade', async () => {
  const rm = await ok('GET', '/students/me/roadmap', undefined, s.st);
  assert.equal(rm.currentGrade, 6);
  const eng = rm.grades.find((g: any) => g.grade === 6).subjects.find((x: any) => x.subject === 'ENGLISH');
  assert.equal(eng.topics.find((t: any) => t.id === 'vocabulary').state, 'mastered');
  assert.ok(rm.nextSteps.length > 0);
});

test('parent: edits a block (kept on rebuild), adds a clashing block, assigns practice', async () => {
  const kids = await ok('GET', '/family/children', undefined, s.pt);
  assert.equal(kids.children.length, 1);
  const kidId = kids.children[0].id;
  const sched = await ok('GET', `/students/${kidId}/schedule?weekStart=${MON}&today=${MON}`, undefined, s.pt);
  const target = sched.blocks.find((b: any) => !b.completed);
  const moved = await ok('PATCH', `/students/${kidId}/schedule/blocks/${target.id}`, { startTime: '17:00', endTime: '17:30', subject: 'VERBAL' }, s.pt);
  assert.equal(moved.block.isManual, true);
  const regen = await ok('POST', `/students/${kidId}/schedule/generate`, { weekStart: MON, today: MON }, s.pt);
  const after = await ok('GET', `/students/${kidId}/schedule?weekStart=${MON}&today=${MON}`, undefined, s.pt);
  assert.ok(after.blocks.some((b: any) => b.id === target.id && b.startTime === '17:00'));
  const scored = regen.priorities.filter((x: any) => x.score !== null);
  for (let i = 1; i < scored.length; i++) assert.ok(scored[i - 1].score <= scored[i].score, 'weakest subject first');
  const added = await ok('POST', `/students/${kidId}/schedule/blocks`, { date: WED, startTime: '18:15', endTime: '18:45', subject: 'MATHS' }, s.pt);
  assert.ok(added.warnings.length >= 1);
  const assigned = await ok('POST', `/students/${kidId}/practice`, { subject: 'VERBAL', topicId: 'codes', count: 3 }, s.pt);
  const list = await ok('GET', '/students/me/practice', undefined, s.st);
  assert.ok(list.sets.find((x: any) => x.id === assigned.set.id).assigned);
});

test('practice from a stored PDF; unknown topic gives the "different PDF" error', async () => {
  const doc = await prisma.document.create({
    data: {
      subject: 'MATHS',
      grade: 5,
      originalName: 'fractions.pdf',
      storedName: 'missing.pdf',
      sizeBytes: 1,
      pageCount: 1,
      text: 'Fractions represent parts of a whole. The numerator is the number on top of a fraction. The denominator tells us how many equal parts the whole is divided into. Equivalent fractions have the same value even though they look different. To add fractions with the same denominator, add the numerators and keep the denominator.',
    },
  });
  const dp = await ok('POST', `/students/${s.kidId}/practice`, { subject: 'MATHS', source: 'document', documentId: doc.id, topicText: 'Fractions', count: 3 }, s.pt);
  assert.ok(dp.set.questions.length >= 2);
  const nf = await call('POST', `/students/${s.kidId}/practice`, { subject: 'MATHS', source: 'document', documentId: doc.id, topicText: 'Volcanoes' }, s.pt);
  assert.equal(nf.status, 422);
  assert.match(nf.data.error, /not found in this PDF/);
  await prisma.document.delete({ where: { id: doc.id } });
});

test('access control between accounts', async () => {
  const other = await ok('POST', '/auth/register', { name: 'Other', email: 'other@test.local', password: 'secret1', role: 'STUDENT' });
  assert.equal((await call('GET', `/students/${s.kidId}/schedule`, undefined, other.token)).status, 403);
  const p2 = await ok('POST', '/auth/register', { name: 'P2', email: 'p2@test.local', password: 'secret1', role: 'PARENT' });
  assert.equal((await call('GET', `/students/${s.kidId}/agenda`, undefined, p2.token)).status, 403);
  assert.equal((await call('GET', '/admin/exams', undefined, s.st)).status, 403);
  assert.equal((await call('GET', '/students/me/agenda')).status, 401);
  assert.equal((await call('GET', '/students/me/agenda', undefined, 'garbage.token.here')).status, 401);
  assert.equal((await ok('POST', '/family/children/link', { email: 'other@test.local' }, p2.token)).child.email, 'other@test.local');
});

test('admin: upload a real PDF, edit/validate/regenerate exams', async () => {
  await prisma.user.create({
    data: { email: 'admin@test.local', name: 'Admin', role: 'ADMIN', onboarded: true, passwordHash: await bcrypt.hash('admin123', 10) },
  });
  const at = (await ok('POST', '/auth/login', { email: 'admin@test.local', password: 'admin123' })).token;

  if (!process.env.SKIP_UPLOAD_TEST) {
    const form = new FormData();
    form.append('subject', 'MATHS');
    form.append('grade', '5');
    form.append('file', new Blob([makePdf(['Chapter 3: Fractions.', 'Fractions represent parts of a whole object or group.', 'The numerator is the number written on top of a fraction.', 'The denominator shows how many equal parts make the whole.'])], { type: 'application/pdf' }), 'fractions.pdf');
    const res = await fetch(`${base}/admin/documents`, { method: 'POST', headers: { authorization: `Bearer ${at}` }, body: form });
    const up = await res.json();
    assert.equal(res.status, 201, JSON.stringify(up));
    assert.equal(up.document.pageCount, 1);
    assert.ok(up.document.characters > 50, 'text extracted from PDF');
    const docs = await ok('GET', '/admin/documents', undefined, at);
    assert.ok(docs.documents.find((d: any) => d.id === up.document.id).topicsFound.includes('Fractions'));
    const pdfPractice = await ok('POST', `/students/${s.kidId}/practice`, { subject: 'MATHS', source: 'document', documentId: up.document.id, topicText: 'Fractions', count: 2 }, at);
    assert.ok(pdfPractice.set.questions.length >= 1);
    const notPdf = new FormData();
    notPdf.append('subject', 'MATHS');
    notPdf.append('file', new Blob(['hello'], { type: 'application/pdf' }), 'fake.pdf');
    assert.equal((await fetch(`${base}/admin/documents`, { method: 'POST', headers: { authorization: `Bearer ${at}` }, body: notPdf })).status, 400);
    await ok('DELETE', `/admin/documents/${up.document.id}`, undefined, at);
  }

  const exams = await ok('GET', '/admin/exams?grade=5', undefined, at);
  assert.equal(exams.exams.length, 4);
  const e0 = exams.exams[0];
  assert.equal((await call('PUT', `/admin/exams/${e0.id}`, { questions: [{ type: 'mcq', prompt: 'x', options: ['a', 'b'], answer: 'c' }] }, at)).status, 400);
  const upd = await ok('PUT', `/admin/exams/${e0.id}`, { title: 'Edited', questions: [{ type: 'number', prompt: '2+2?', answer: '4' }] }, at);
  assert.equal(upd.exam.questions[0].answer, 4);
  const regen = await ok('POST', `/admin/exams/${e0.id}/regenerate`, {}, at);
  assert.equal(regen.exam.questions.length, 20);
});

test('preferences: invalid window rejected; studying around activities when skip is off', async () => {
  assert.equal((await call('PATCH', '/students/me', { settings: { weekdayWindow: { start: '20:00', end: '16:00' } } }, s.st)).status, 400);
  const set = await ok('PATCH', '/students/me', { settings: { skipActivityDays: false, maxBlocksWeekday: 3 }, today: MON }, s.st);
  assert.equal(set.settings.skipActivityDays, false);
  const sched = await ok('GET', `/students/me/schedule?weekStart=${MON}&today=${MON}`, undefined, s.st);
  const wed = sched.blocks.filter((b: any) => b.date === WED && !b.isManual);
  assert.ok(wed.length > 0, 'Wednesday now has study');
  assert.ok(wed.every((b: any) => b.endTime <= '17:45' || b.startTime >= '19:15'), 'Wednesday study avoids Drums 18:00-19:00');
});

/** Build a small valid one-page PDF with the given lines of text. */
function makePdf(lines: string[]): string {
  const esc = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`);
  const content = `BT /F1 12 Tf 50 750 Td 16 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf; // plain ASCII, so string length = byte offsets
}
