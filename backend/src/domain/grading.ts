// Automated grading: exact grading for objective questions and a transparent rubric for essays.
import type { Question } from './types.js';

export interface QuestionResult {
  id: string;
  correct: boolean;
  /** 0-100 for essays, 0 or 100 for objective questions */
  score: number;
  given: string;
  expected?: string;
  explanation?: string;
  feedback?: string[];
}

export interface GradeResult {
  score: number; // 0-100, rounded to 1 dp
  correctCount: number;
  total: number;
  results: QuestionResult[];
}

const norm = (s: unknown) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!]+$/, '');

const parseNumber = (s: unknown): number | null => {
  if (typeof s === 'number') return Number.isFinite(s) ? s : null;
  const cleaned = String(s ?? '').replace(/[$,%\s]/g, '').replace(/−/g, '-');
  if (cleaned === '' || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
};

export const isAnswerCorrect = (q: Question, given: unknown): boolean => {
  if (q.answer === undefined) return false;
  if (q.type === 'number') {
    const n = parseNumber(given);
    const expected = Number(q.answer);
    return n !== null && Math.abs(n - expected) < 0.005;
  }
  return norm(given) === norm(q.answer);
};

// ---------------------------------------------------------------------------
// Essay rubric (FR11). Deterministic and explainable so parents can see why a score was given.
// Criteria (total 100): length 25, structure 20, sentence quality 20, vocabulary 15, relevance 20.
// ---------------------------------------------------------------------------

export interface EssayGrade {
  score: number;
  breakdown: { criterion: string; points: number; max: number }[];
  feedback: string[];
  wordCount: number;
}

export const gradeEssay = (text: string, opts: { minWords?: number; keywords?: string[]; prompt?: string } = {}): EssayGrade => {
  const minWords = opts.minWords ?? 120;
  const clean = (text ?? '').trim();
  const words = clean.match(/[A-Za-z']+/g) ?? [];
  const wordCount = words.length;
  const feedback: string[] = [];

  if (wordCount === 0) {
    return {
      score: 0,
      wordCount: 0,
      breakdown: [],
      feedback: ['No writing was submitted. Have a go — even a few sentences is a great start!'],
    };
  }

  // Length
  const lengthPts = Math.round(25 * Math.min(1, wordCount / minWords));
  if (wordCount < minWords) feedback.push(`Aim for at least ${minWords} words — you wrote ${wordCount}. Add more detail and examples.`);
  else feedback.push(`Great length (${wordCount} words).`);

  // Structure: paragraphs
  const paragraphs = clean.split(/\n\s*\n|\n/).filter((p) => p.trim().split(/\s+/).length >= 8);
  const structurePts = paragraphs.length >= 3 ? 20 : paragraphs.length === 2 ? 14 : 7;
  if (paragraphs.length < 3) feedback.push('Organise your writing into paragraphs: an introduction, body and conclusion.');

  // Sentence quality: capital letters, end punctuation, sensible sentence length
  const sentences = clean.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const capitalised = sentences.filter((s) => /^["'“‘]?[A-Z0-9]/.test(s.trim())).length / sentences.length;
  const punctuated = sentences.filter((s) => /[.!?]["'”’]?$/.test(s.trim())).length / sentences.length;
  const avgLen = wordCount / sentences.length;
  const lenScore = avgLen >= 8 && avgLen <= 22 ? 1 : avgLen >= 5 && avgLen <= 30 ? 0.6 : 0.3;
  const sentencePts = Math.round(20 * (0.35 * capitalised + 0.35 * punctuated + 0.3 * lenScore));
  if (capitalised < 0.9) feedback.push('Start every sentence with a capital letter.');
  if (punctuated < 0.9) feedback.push('End every sentence with a full stop, question mark or exclamation mark.');
  if (avgLen > 25) feedback.push('Some sentences are very long — try splitting them up.');
  if (avgLen < 6) feedback.push('Try joining short sentences with words like "because", "although" or "which".');

  // Vocabulary: lexical diversity + linking words
  const lower = words.map((w) => w.toLowerCase());
  const diversity = new Set(lower).size / wordCount;
  const connectives = ['because', 'however', 'therefore', 'although', 'finally', 'firstly', 'secondly', 'moreover', 'meanwhile', 'suddenly', 'furthermore', 'instead', 'since', 'unless'];
  const usedConnectives = connectives.filter((c) => lower.includes(c)).length;
  const vocabPts = Math.round(15 * (0.6 * Math.min(1, diversity / 0.55) + 0.4 * Math.min(1, usedConnectives / 3)));
  if (usedConnectives < 2) feedback.push('Use linking words such as "however", "because" and "finally" to connect your ideas.');
  if (diversity < 0.45) feedback.push('Try to vary your word choices instead of repeating the same words.');

  // Relevance: keyword coverage of the prompt
  const keywords = (opts.keywords ?? []).map((k) => k.toLowerCase());
  let relevancePts = 20;
  if (keywords.length) {
    const hits = keywords.filter((k) => lower.some((w) => w.startsWith(k.slice(0, Math.max(4, k.length - 2))))).length;
    relevancePts = Math.round(20 * Math.min(1, hits / Math.max(2, Math.ceil(keywords.length / 2))));
    if (relevancePts < 14) feedback.push('Make sure every paragraph answers the question that was asked.');
  }

  const breakdown = [
    { criterion: 'Length', points: lengthPts, max: 25 },
    { criterion: 'Structure', points: structurePts, max: 20 },
    { criterion: 'Sentences & punctuation', points: sentencePts, max: 20 },
    { criterion: 'Vocabulary', points: vocabPts, max: 15 },
    { criterion: 'Relevance', points: relevancePts, max: 20 },
  ];
  const score = breakdown.reduce((a, b) => a + b.points, 0);
  if (score >= 85) feedback.unshift('Excellent writing — well done! 🌟');
  else if (score >= 70) feedback.unshift('Good effort! A few tweaks will make it even better.');
  else feedback.unshift('Nice start! Work on the tips below to improve.');
  return { score, breakdown, feedback, wordCount };
};

/** Grade a full set (practice or exam). Essays count as one question scored 0-100. */
export const gradeSet = (questions: Question[], answers: Record<string, unknown>): GradeResult => {
  const results: QuestionResult[] = questions.map((q) => {
    const given = answers?.[q.id];
    if (q.type === 'essay') {
      const g = gradeEssay(String(given ?? ''), { minWords: q.minWords, keywords: q.keywords, prompt: q.prompt });
      return { id: q.id, correct: g.score >= 50, score: g.score, given: String(given ?? ''), feedback: g.feedback };
    }
    const correct = isAnswerCorrect(q, given);
    return {
      id: q.id,
      correct,
      score: correct ? 100 : 0,
      given: given === undefined || given === null ? '' : String(given),
      expected: String(q.answer ?? ''),
      explanation: q.explanation,
    };
  });
  const total = results.length;
  const score = total ? Math.round((results.reduce((a, r) => a + r.score, 0) / total) * 10) / 10 : 0;
  return { score, correctCount: results.filter((r) => r.correct).length, total, results };
};
