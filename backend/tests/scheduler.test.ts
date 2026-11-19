import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSchedule, DEFAULT_SETTINGS, findFreeSlots, prioritise } from '../src/domain/scheduler.js';
import { toMinutes, overlaps, dayOfWeek } from '../src/lib/dates.js';

const WEEK = '2026-11-16'; // a Monday
const school = [1, 2, 3, 4, 5].map((d) => ({ kind: 'SCHOOL' as const, name: 'School', dayOfWeek: d, startTime: '08:30', endTime: '15:30' }));
const drums = { kind: 'ACTIVITY' as const, name: 'Drum class', dayOfWeek: 3, startTime: '18:00', endTime: '19:00' };
const karate = { kind: 'ACTIVITY' as const, name: 'Karate', dayOfWeek: 1, startTime: '16:30', endTime: '17:30' };

test('no study is scheduled on an activity day (Drum class Wednesday)', () => {
  const out = generateSchedule({ weekStart: WEEK, commitments: [...school, drums], subjectScores: {} });
  const wednesday = out.blocks.filter((b) => dayOfWeek(b.date) === 3);
  assert.equal(wednesday.length, 0);
  assert.ok(out.skippedDays.some((d) => d.date === '2026-11-18' && /Drum/.test(d.reason)));
});

test('when skipActivityDays is off, blocks avoid the activity time instead', () => {
  const out = generateSchedule({
    weekStart: WEEK,
    commitments: [...school, karate],
    subjectScores: {},
    settings: { ...DEFAULT_SETTINGS, skipActivityDays: false, maxBlocksWeekday: 4 },
  });
  const monday = out.blocks.filter((b) => b.date === WEEK);
  assert.ok(monday.length > 0);
  for (const b of monday) {
    // must not overlap karate (with 15 min buffer)
    assert.ok(!overlaps(toMinutes(b.startTime), toMinutes(b.endTime), toMinutes('16:15'), toMinutes('17:45')), `${b.startTime} clashes`);
  }
});

test('no generated block overlaps school or another block', () => {
  const out = generateSchedule({ weekStart: WEEK, commitments: school, subjectScores: {} });
  const byDate = new Map<string, typeof out.blocks>();
  out.blocks.forEach((b) => byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]));
  for (const [, list] of byDate) {
    for (const b of list) if (dayOfWeek(b.date) >= 1 && dayOfWeek(b.date) <= 5) assert.ok(toMinutes(b.startTime) >= toMinutes('15:45'));
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        assert.ok(!overlaps(toMinutes(list[i].startTime), toMinutes(list[i].endTime), toMinutes(list[j].startTime), toMinutes(list[j].endTime)));
  }
});

test('weakest subject gets the most blocks and the first slot', () => {
  const out = generateSchedule({ weekStart: WEEK, commitments: school, subjectScores: { MATHS: 55, ENGLISH: 96, VERBAL: 90, QUANTITATIVE: 88 } });
  const count = (s: string) => out.blocks.filter((b) => b.subject === s).length;
  assert.equal(out.blocks[0].subject, 'MATHS');
  assert.ok(count('MATHS') > count('ENGLISH'));
  assert.ok(count('MATHS') >= count('VERBAL') && count('MATHS') >= count('QUANTITATIVE'));
  // every subject still appears at least once
  for (const s of ['MATHS', 'ENGLISH', 'VERBAL', 'QUANTITATIVE']) assert.ok(count(s) >= 1, `${s} missing`);
});

test('manual (fixed) blocks are respected', () => {
  const fixed = [{ date: WEEK, startTime: '16:00', endTime: '17:00' }];
  const out = generateSchedule({ weekStart: WEEK, commitments: school, fixedBlocks: fixed, subjectScores: {} });
  const monday = out.blocks.filter((b) => b.date === WEEK);
  assert.equal(monday.length, DEFAULT_SETTINGS.maxBlocksWeekday - 1);
  for (const b of monday) assert.ok(toMinutes(b.startTime) >= toMinutes('17:15'));
});

test('fromDate skips days in the past', () => {
  const out = generateSchedule({ weekStart: WEEK, commitments: school, subjectScores: {}, fromDate: '2026-11-20' });
  assert.ok(out.blocks.every((b) => b.date >= '2026-11-20'));
});

test('findFreeSlots skips busy intervals with buffer', () => {
  const slots = findFreeSlots({ start: '16:00', end: '20:00' }, [{ start: toMinutes('16:30'), end: toMinutes('17:30') }], 30, 15, 3);
  assert.deepEqual(slots.map((s) => s.start), [toMinutes('17:45'), toMinutes('18:30'), toMinutes('19:15')]);
});

test('prioritise orders by lowest score; unknown is medium', () => {
  const p = prioritise({ MATHS: 99, ENGLISH: 40 });
  assert.equal(p[0].subject, 'ENGLISH');
  assert.equal(p[p.length - 1].subject, 'MATHS');
});
