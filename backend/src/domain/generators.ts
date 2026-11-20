// Procedural question generators for Maths, Quantitative and some Verbal topics.
// Every generator is deterministic for a given RNG so exams can be reproduced.
import type { Question } from './types.js';
import { type Rng, randInt, pick, shuffle, gcd } from './random.js';

type Gen = (rng: Rng) => Omit<Question, 'id' | 'topic'>;

const fmt = (n: number) => n.toLocaleString('en-US');
const money = (n: number) => `$${n.toFixed(2)}`;

/** Build an MCQ with numeric distractors around the correct value. */
const numericMcq = (rng: Rng, prompt: string, correct: number, render: (n: number) => string = String, explanation?: string) => {
  const opts = new Set<string>([render(correct)]);
  const deltas = shuffle(rng, [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10]);
  for (const d of deltas) {
    if (opts.size >= 4) break;
    const cand = correct + d * Math.max(1, Math.round(Math.abs(correct) / 20));
    if (cand !== correct) opts.add(render(cand));
  }
  return { type: 'mcq' as const, prompt, options: shuffle(rng, [...opts]), answer: render(correct), explanation };
};

const fractionStr = (n: number, d: number) => {
  const g = gcd(n, d);
  const nn = n / g;
  const dd = d / g;
  return dd === 1 ? String(nn) : `${nn}/${dd}`;
};

const fractionMcq = (rng: Rng, prompt: string, n: number, d: number, explanation?: string) => {
  const correct = fractionStr(n, d);
  const opts = new Set<string>([correct]);
  const candidates = [
    fractionStr(n + 1, d),
    fractionStr(Math.max(1, n - 1), d),
    fractionStr(n, d + 1),
    `${n}/${d * 2}`,
    fractionStr(d, n || 1),
    fractionStr(n + 2, d + 1),
  ];
  for (const c of shuffle(rng, candidates)) {
    if (opts.size >= 4) break;
    opts.add(c);
  }
  return { type: 'mcq' as const, prompt, options: shuffle(rng, [...opts]), answer: correct, explanation };
};

export const GENERATORS: Record<string, Gen> = {
  // ---------- Maths, Grade 5 ----------
  'place-value': (rng) => {
    const n = randInt(rng, 10000, 99999);
    const to = pick(rng, [10, 100, 1000] as const);
    const ans = Math.round(n / to) * to;
    return { type: 'number', prompt: `Round ${fmt(n)} to the nearest ${fmt(to)}.`, answer: ans, explanation: `${fmt(n)} rounds to ${fmt(ans)}.` };
  },
  multiplication: (rng) => {
    const a = randInt(rng, 12, 99);
    const b = randInt(rng, 11, 49);
    return { type: 'number', prompt: `What is ${a} × ${b}?`, answer: a * b, explanation: `${a} × ${b} = ${a * b}` };
  },
  division: (rng) => {
    const d = randInt(rng, 3, 12);
    const q = randInt(rng, 12, 95);
    return { type: 'number', prompt: `What is ${fmt(d * q)} ÷ ${d}?`, answer: q, explanation: `${d} × ${q} = ${d * q}` };
  },
  fractions: (rng) => {
    const d = pick(rng, [2, 3, 4, 5, 6, 8, 10]);
    const n = randInt(rng, 1, d - 1);
    const whole = d * randInt(rng, 3, 12);
    const ans = (whole / d) * n;
    return { type: 'number', prompt: `What is ${n}/${d} of ${whole}?`, answer: ans, explanation: `${whole} ÷ ${d} = ${whole / d}, then × ${n} = ${ans}` };
  },
  decimals: (rng) => {
    const a = randInt(rng, 10, 999) / 10;
    const b = randInt(rng, 10, 999) / 100;
    const ans = Math.round((a + b) * 100) / 100;
    return { type: 'number', prompt: `What is ${a} + ${b}?`, answer: ans, explanation: `Line up the decimal points: ${a} + ${b} = ${ans}` };
  },
  'perimeter-area': (rng) => {
    const l = randInt(rng, 3, 20);
    const w = randInt(rng, 2, 15);
    if (rng() < 0.5) {
      return { type: 'number', prompt: `A rectangle is ${l} cm long and ${w} cm wide. What is its area in cm²?`, answer: l * w, explanation: `Area = length × width = ${l} × ${w} = ${l * w}` };
    }
    return { type: 'number', prompt: `A rectangle is ${l} m long and ${w} m wide. What is its perimeter in m?`, answer: 2 * (l + w), explanation: `Perimeter = 2 × (${l} + ${w}) = ${2 * (l + w)}` };
  },

  // ---------- Maths, Grade 6 ----------
  'fraction-operations': (rng) => {
    const d = pick(rng, [4, 6, 8, 10, 12]);
    const a = randInt(rng, 1, d - 1);
    const b = randInt(rng, 1, d - 1);
    if (rng() < 0.5 || a <= b) {
      return fractionMcq(rng, `What is ${a}/${d} + ${b}/${d}? (simplest form)`, a + b, d, `Same denominator: add numerators → ${a + b}/${d}`);
    }
    return fractionMcq(rng, `What is ${a}/${d} − ${b}/${d}? (simplest form)`, a - b, d, `Same denominator: subtract numerators → ${a - b}/${d}`);
  },
  percentages: (rng) => {
    const p = pick(rng, [10, 20, 25, 30, 40, 50, 75]);
    const whole = randInt(rng, 2, 20) * 20;
    const ans = (p / 100) * whole;
    return { type: 'number', prompt: `What is ${p}% of ${whole}?`, answer: ans, explanation: `${p}% of ${whole} = ${p}/100 × ${whole} = ${ans}` };
  },
  ratios: (rng) => {
    const a = randInt(rng, 1, 5);
    let b = randInt(rng, 1, 5);
    if (b === a) b = a + 1;
    const total = (a + b) * randInt(rng, 2, 12);
    const larger = (Math.max(a, b) / (a + b)) * total;
    return { type: 'number', prompt: `Share ${total} in the ratio ${a}:${b}. What is the larger share?`, answer: larger, explanation: `${a + b} parts → each part is ${total / (a + b)}; larger share = ${larger}` };
  },
  'order-of-operations': (rng) => {
    const a = randInt(rng, 2, 20);
    const b = randInt(rng, 2, 9);
    const c = randInt(rng, 2, 9);
    const d = randInt(rng, 1, 10);
    const ans = a + b * c - d;
    return { type: 'number', prompt: `Calculate: ${a} + ${b} × ${c} − ${d}`, answer: ans, explanation: `Multiply first: ${b} × ${c} = ${b * c}; then ${a} + ${b * c} − ${d} = ${ans}` };
  },
  integers: (rng) => {
    const a = randInt(rng, -15, 15);
    const b = randInt(rng, 1, 15);
    const c = randInt(rng, -12, -1);
    const ans = a + b - c;
    return { type: 'number', prompt: `Calculate: ${a} + ${b} − (${c})`, answer: ans, explanation: `Subtracting a negative is adding: ${a} + ${b} + ${-c} = ${ans}` };
  },
  'triangle-area': (rng) => {
    const b = randInt(rng, 2, 12) * 2;
    const h = randInt(rng, 3, 15);
    return { type: 'number', prompt: `A triangle has base ${b} cm and height ${h} cm. What is its area in cm²?`, answer: (b * h) / 2, explanation: `Area = ½ × ${b} × ${h} = ${(b * h) / 2}` };
  },

  // ---------- Maths, Grade 7 ----------
  'algebraic-expressions': (rng) => {
    const x = randInt(rng, 2, 9);
    const m = randInt(rng, 2, 9);
    const c = randInt(rng, 1, 20);
    return { type: 'number', prompt: `If x = ${x}, what is ${m}x + ${c}?`, answer: m * x + c, explanation: `${m} × ${x} + ${c} = ${m * x + c}` };
  },
  'linear-equations': (rng) => {
    const x = randInt(rng, 1, 15);
    const m = randInt(rng, 2, 9);
    const c = randInt(rng, 1, 30);
    return { type: 'number', prompt: `Solve for x: ${m}x + ${c} = ${m * x + c}`, answer: x, explanation: `${m}x = ${m * x + c} − ${c} = ${m * x}, so x = ${x}` };
  },
  'percent-change': (rng) => {
    const start = randInt(rng, 2, 20) * 10;
    const pct = pick(rng, [10, 20, 25, 50]);
    const up = rng() < 0.6;
    const end = up ? start * (1 + pct / 100) : start * (1 - pct / 100);
    return { type: 'number', prompt: `A price changes from $${start} to $${end}. What is the percentage ${up ? 'increase' : 'decrease'}?`, answer: pct, explanation: `Change = ${Math.abs(end - start)}; ${Math.abs(end - start)} ÷ ${start} × 100 = ${pct}%` };
  },
  probability: (rng) => {
    const r = randInt(rng, 1, 8);
    const b = randInt(rng, 1, 8);
    const g = randInt(rng, 0, 5);
    return fractionMcq(rng, `A bag has ${r} red, ${b} blue${g ? ` and ${g} green` : ''} marbles. What is the probability of picking a red marble?`, r, r + b + g, `${r} red out of ${r + b + g} marbles`);
  },

  // ---------- Quantitative ----------
  'number-series': (rng) => {
    const kind = pick(rng, ['add', 'mult', 'square', 'growing'] as const);
    let seq: number[] = [];
    if (kind === 'add') {
      const s = randInt(rng, 1, 30);
      const d = randInt(rng, 2, 12);
      seq = Array.from({ length: 6 }, (_, i) => s + d * i);
    } else if (kind === 'mult') {
      const s = randInt(rng, 1, 5);
      const r = randInt(rng, 2, 3);
      seq = Array.from({ length: 6 }, (_, i) => s * r ** i);
    } else if (kind === 'square') {
      const s = randInt(rng, 1, 6);
      seq = Array.from({ length: 6 }, (_, i) => (s + i) ** 2);
    } else {
      const s = randInt(rng, 1, 10);
      seq = [s];
      for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + i);
    }
    const answer = seq.pop() as number;
    return { type: 'number', prompt: `What number comes next? ${seq.join(', ')}, ?`, answer, explanation: `The pattern continues to ${answer}.` };
  },
  'word-problems': (rng) => {
    const name = pick(rng, ['Ava', 'Liam', 'Mia', 'Noah', 'Zara', 'Arjun', 'Priya']);
    const item = pick(rng, ['pens', 'notebooks', 'stickers', 'apples']);
    const qty = randInt(rng, 2, 6);
    const price = randInt(rng, 3, 19) / 2; // 1.50 .. 9.50
    const paid = Math.ceil((qty * price) / 10) * 10 + (rng() < 0.5 ? 0 : 10);
    const change = Math.round((paid - qty * price) * 100) / 100;
    return { type: 'number', prompt: `${name} buys ${qty} ${item} at ${money(price)} each and pays with $${paid}. How much change (in dollars) does ${name} get?`, answer: change, explanation: `Cost = ${qty} × ${money(price)} = ${money(qty * price)}; change = $${paid} − ${money(qty * price)} = ${money(change)}` };
  },
  averages: (rng) => {
    const n = randInt(rng, 4, 5);
    const mean = randInt(rng, 10, 60);
    const nums = Array.from({ length: n - 1 }, () => mean + randInt(rng, -8, 8));
    nums.push(mean * n - nums.reduce((a, b) => a + b, 0));
    return { type: 'number', prompt: `What is the average (mean) of ${shuffle(rng, nums).join(', ')}?`, answer: mean, explanation: `Sum = ${mean * n}; ${mean * n} ÷ ${n} = ${mean}` };
  },
  'speed-distance-time': (rng) => {
    const s = randInt(rng, 3, 12) * 10;
    const t = randInt(rng, 2, 6);
    const kind = pick(rng, ['d', 't', 's'] as const);
    if (kind === 'd') return { type: 'number', prompt: `A train travels at ${s} km/h for ${t} hours. How many km does it travel?`, answer: s * t, explanation: `Distance = speed × time = ${s * t} km` };
    if (kind === 't') return { type: 'number', prompt: `A car travels ${s * t} km at ${s} km/h. How many hours does it take?`, answer: t, explanation: `Time = distance ÷ speed = ${t} h` };
    return { type: 'number', prompt: `A cyclist rides ${s * t} km in ${t} hours. What is the speed in km/h?`, answer: s, explanation: `Speed = distance ÷ time = ${s} km/h` };
  },
  'time-problems': (rng) => {
    const startH = randInt(rng, 1, 8);
    const startM = pick(rng, [0, 15, 30, 45]);
    const durH = randInt(rng, 0, 2);
    const durM = pick(rng, [10, 20, 25, 35, 40, 50]);
    const total = startH * 60 + startM + durH * 60 + durM;
    const render = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${((h - 1) % 12) + 1}:${String(m).padStart(2, '0')} pm`;
    };
    const opts = new Set([render(total), render(total + 10), render(total - 10), render(total + 60)]);
    return { type: 'mcq', prompt: `A movie starts at ${render(startH * 60 + startM)} and lasts ${durH ? `${durH} h ` : ''}${durM} min. When does it end?`, options: shuffle(rng, [...opts]), answer: render(total), explanation: `Add ${durH} h ${durM} min to the start time.` };
  },
  'data-interpretation': (rng) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const vals = days.map(() => randInt(rng, 5, 40));
    const kind = pick(rng, ['total', 'diff', 'max'] as const);
    const table = days.map((d, i) => `${d}: ${vals[i]}`).join(', ');
    if (kind === 'total') return { type: 'number', prompt: `Books borrowed from the library — ${table}. How many books were borrowed in total?`, answer: vals.reduce((a, b) => a + b, 0) };
    if (kind === 'diff') return { type: 'number', prompt: `Books borrowed from the library — ${table}. How many more books were borrowed on the busiest day than the quietest day?`, answer: Math.max(...vals) - Math.min(...vals) };
    const maxDay = days[vals.indexOf(Math.max(...vals))];
    return { type: 'mcq', prompt: `Books borrowed from the library — ${table}. Which day was the busiest?`, options: days, answer: maxDay };
  },

  // ---------- Verbal (procedural) ----------
  'letter-series': (rng) => {
    const step = randInt(rng, 1, 4);
    const start = randInt(rng, 0, 25 - step * 5);
    const letters = Array.from({ length: 5 }, (_, i) => String.fromCharCode(65 + start + step * i));
    const answer = letters.pop() as string;
    return { type: 'text', prompt: `Which letter comes next? ${letters.join(', ')}, ?`, answer, explanation: `Each letter moves ${step} place${step > 1 ? 's' : ''} forward in the alphabet.` };
  },
  codes: (rng) => {
    const words = ['CAT', 'DOG', 'SUN', 'MAP', 'PEN', 'BOX', 'HAT', 'CUP', 'FISH', 'BIRD', 'TREE', 'BOOK'];
    const shift = randInt(rng, 1, 3);
    const enc = (w: string) => w.split('').map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65)).join('');
    const [w1, w2] = shuffle(rng, words);
    return { type: 'text', prompt: `If ${w1} is written in code as ${enc(w1)}, how is ${w2} written in the same code?`, answer: enc(w2), explanation: `Each letter moves ${shift} place${shift > 1 ? 's' : ''} forward.` };
  },
};

export const hasGenerator = (topicId: string) => topicId in GENERATORS;
