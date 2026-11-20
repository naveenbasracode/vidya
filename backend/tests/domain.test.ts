import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusFor, weeklySummary, subjectAverages } from '../src/domain/achievements.js';
import { gradeEssay, gradeSet, isAnswerCorrect } from '../src/domain/grading.js';
import { buildPractice, buildExam, buildPracticeFromText, buildMixedPractice, TopicNotFoundError } from '../src/domain/questions.js';
import { TOPICS } from '../src/domain/curriculum.js';
import { createRng } from '../src/domain/random.js';
import { buildRoadmap } from '../src/domain/roadmap.js';
import { startOfWeek, addDays } from '../src/lib/dates.js';

test('status thresholds: >=95 green, 85-94 amber, <85 red', () => {
  assert.equal(statusFor(95), 'GREEN');
  assert.equal(statusFor(100), 'GREEN');
  assert.equal(statusFor(94.9), 'AMBER');
  assert.equal(statusFor(90), 'AMBER'); // acceptance criterion: 90% exam → Amber
  assert.equal(statusFor(85), 'AMBER');
  assert.equal(statusFor(84.9), 'RED');
});

test('weekly summary: academic and activity', () => {
  const s = weeklySummary({
    weekStart: '2026-11-16',
    today: '2026-11-18', // Wednesday → 3 days elapsed
    scores: [
      { subject: 'MATHS', score: 90, date: '2026-11-16' },
      { subject: 'ENGLISH', score: 70, date: '2026-11-17' },
      { subject: 'MATHS', score: 100, date: '2026-11-09' }, // previous week, ignored
    ],
    habits: [{ id: 'h1', name: 'Reading', minutes: 15, since: '2026-01-01', active: true }],
    habitLogs: [
      { habitId: 'h1', date: '2026-11-16', completed: true },
      { habitId: 'h1', date: '2026-11-17', completed: true },
    ],
    studyBlocks: [
      { date: '2026-11-16', completed: true },
      { date: '2026-11-19', completed: false }, // future, not expected yet
    ],
  });
  assert.equal(s.academic.percent, 80);
  assert.equal(s.academic.status, 'RED');
  assert.equal(s.activity.expected, 4); // 3 habit-days + 1 study block
  assert.equal(s.activity.done, 3);
  assert.equal(s.activity.percent, 75);
  assert.deepEqual(s.strengths, ['MATHS']);
  assert.deepEqual(s.focusAreas, ['ENGLISH']);
});

test('subject averages use the most recent scores', () => {
  const avg = subjectAverages(
    [10, 20, 90, 90, 90, 90, 90].map((score) => ({ subject: 'MATHS' as const, score, date: '2026-11-16' })),
    5,
  );
  assert.equal(avg.MATHS, 90);
});

test('every curriculum topic produces practice questions', () => {
  for (const tp of TOPICS) {
    const qs = buildPractice(tp.id, 5, createRng(42));
    assert.ok(qs.length >= 1, `${tp.id} produced none`);
    for (const q of qs) {
      assert.ok(q.prompt.length > 5);
      if (q.type === 'mcq') {
        assert.ok(q.options && q.options.length >= 2, `${tp.id} mcq without options`);
        assert.ok(q.options!.includes(String(q.answer)), `${tp.id}: answer not in options: ${q.prompt}`);
        assert.equal(new Set(q.options).size, q.options!.length, `${tp.id}: duplicate options`);
      }
      if (q.type !== 'essay') assert.ok(isAnswerCorrect(q, q.answer), `${tp.id}: own answer graded wrong`);
    }
  }
});

test('generated questions are reproducible with the same seed', () => {
  assert.deepEqual(buildExam('MATHS', 6, createRng(7)), buildExam('MATHS', 6, createRng(7)));
});

test('exams have 20 questions; English ends with an essay', () => {
  for (const g of [5, 6, 7]) {
    for (const s of ['MATHS', 'ENGLISH', 'VERBAL', 'QUANTITATIVE'] as const) {
      const exam = buildExam(s, g, createRng(g * 100));
      assert.equal(exam.length, 20, `${s} G${g} has ${exam.length}`);
      assert.equal(new Set(exam.map((q) => q.id)).size, 20);
    }
    const eng = buildExam('ENGLISH', g, createRng(1));
    assert.equal(eng[eng.length - 1].type, 'essay');
  }
});

test('mixed practice gives the requested count', () => {
  assert.equal(buildMixedPractice('QUANTITATIVE', 7, 10, createRng(3)).length, 10);
});

test('grading: numbers tolerate formatting, text is case-insensitive', () => {
  assert.ok(isAnswerCorrect({ id: 'a', type: 'number', prompt: 'x', answer: 1250 }, '1,250'));
  assert.ok(isAnswerCorrect({ id: 'a', type: 'number', prompt: 'x', answer: 3.5 }, '$3.50'));
  assert.ok(!isAnswerCorrect({ id: 'a', type: 'number', prompt: 'x', answer: 3.5 }, 'abc'));
  assert.ok(isAnswerCorrect({ id: 'a', type: 'text', prompt: 'x', answer: 'EGJ' }, ' egj '));
  const r = gradeSet(
    [
      { id: 'q1', type: 'number', prompt: '2+2', answer: 4 },
      { id: 'q2', type: 'mcq', prompt: 'pick', options: ['a', 'b'], answer: 'b' },
    ],
    { q1: '4', q2: 'a' },
  );
  assert.equal(r.score, 50);
  assert.equal(r.correctCount, 1);
});

test('essay grading is deterministic and rewards quality', () => {
  const weak = 'i like homework it is good';
  const strong = `Homework is an important part of learning, and I believe students should have some every day. However, it should not take too long.

Firstly, homework helps students practise what they learned in class. When I practise fractions at home, I remember the steps much better the next day because I have tried them on my own. Regular practice builds confidence.

Secondly, homework teaches responsibility. Students learn to plan their time, finish tasks without reminders and take pride in their work. These skills will help them in secondary school and beyond.

Therefore, I think daily homework is a good idea, as long as it is short and meaningful. A small amount each evening is better than a huge pile on the weekend, and students still have time for sport, music and family.`;
  const opts = { minWords: 150, keywords: ['homework', 'because', 'reason', 'students', 'opinion', 'however', 'therefore'] };
  const a = gradeEssay(strong, opts);
  const b = gradeEssay(strong, opts);
  assert.equal(a.score, b.score);
  assert.ok(a.score >= 85, `strong essay scored ${a.score}`);
  const w = gradeEssay(weak, opts);
  assert.ok(w.score < 50, `weak essay scored ${w.score}`);
  assert.ok(w.feedback.length >= 3);
  assert.equal(gradeEssay('', opts).score, 0);
});

test('PDF practice: generates from matching sentences, errors when topic missing', () => {
  const text = `Fractions represent parts of a whole. The numerator is the number on top of a fraction. The denominator tells us how many equal parts the whole is divided into. Equivalent fractions have the same value even though they look different. To add fractions with the same denominator, add the numerators and keep the denominator. Multiplication is repeated addition of equal groups.`;
  const qs = buildPracticeFromText(text, 'fractions', 5, createRng(1));
  assert.ok(qs.length >= 2);
  for (const q of qs) {
    assert.ok(q.prompt.includes('_____'));
    assert.ok(q.options!.includes(String(q.answer)));
  }
  assert.throws(() => buildPracticeFromText(text, 'Photosynthesis', 5), TopicNotFoundError);
});

test('roadmap marks mastered topics and suggests next steps', () => {
  const r = buildRoadmap(5, [
    { topic: 'multiplication', subject: 'MATHS', score: 95 },
    { topic: 'division', subject: 'MATHS', score: 60 },
  ]);
  const g5 = r.grades.find((g) => g.grade === 5)!;
  const maths = g5.subjects.find((s) => s.subject === 'MATHS')!;
  assert.equal(maths.topics.find((t) => t.id === 'multiplication')!.state, 'mastered');
  assert.equal(maths.topics.find((t) => t.id === 'division')!.state, 'in-progress');
  assert.equal(g5.phase, 'current');
  assert.ok(r.nextSteps.some((s) => s.includes('Division')));
});

test('weeks start on Monday', () => {
  assert.equal(startOfWeek('2026-11-20'), '2026-11-16'); // Friday
  assert.equal(startOfWeek('2026-11-22'), '2026-11-16'); // Sunday
  assert.equal(startOfWeek('2026-11-16'), '2026-11-16');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
