// Builds practice sets and exams from the curriculum, and practice questions from uploaded PDFs.
import type { Question, Subject } from './types.js';
import { SUBJECT_INFO } from './types.js';
import { GENERATORS } from './generators.js';
import { BANK } from './bank.js';
import { getTopic, topicsFor, topicsUpTo, type Topic } from './curriculum.js';
import { type Rng, createRng, shuffle, pick } from './random.js';

export class TopicNotFoundError extends Error {}

const withIds = (qs: Omit<Question, 'id'>[], prefix = 'q'): Question[] => qs.map((q, i) => ({ ...q, id: `${prefix}${i + 1}` }));

/** Make one question for a curriculum topic. `used` avoids repeating bank items within a set. */
const questionForTopic = (topic: Topic, rng: Rng, used: Set<string>, allowEssay: boolean): Omit<Question, 'id'> | null => {
  const gen = GENERATORS[topic.id];
  if (gen) {
    // Generated questions are effectively unlimited; retry a few times to avoid duplicates.
    for (let i = 0; i < 5; i++) {
      const q = gen(rng);
      if (!used.has(q.prompt)) {
        used.add(q.prompt);
        return { ...q, topic: topic.id };
      }
    }
    return null;
  }
  const items = (BANK[topic.id] ?? []).filter((b) => (allowEssay || b.type !== 'essay') && !used.has(b.prompt));
  if (!items.length) return null;
  const item = pick(rng, items);
  used.add(item.prompt);
  const type = item.type ?? 'mcq';
  return { ...item, type, topic: topic.id, options: item.options ? shuffle(rng, item.options) : undefined };
};

/** Practice set for one curriculum topic. */
export const buildPractice = (topicId: string, count = 10, rng: Rng = createRng()): Question[] => {
  const topic = getTopic(topicId);
  if (!topic) throw new TopicNotFoundError(`Unknown topic "${topicId}".`);
  const isEssay = topicId === 'essay-writing';
  const n = isEssay ? 1 : count;
  const used = new Set<string>();
  const out: Omit<Question, 'id'>[] = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const q = questionForTopic(topic, rng, used, isEssay);
    if (q) out.push(q);
  }
  return withIds(out);
};

/** Mixed practice across a subject's topics for a grade (used for "quick practice"). */
export const buildMixedPractice = (subject: Subject, grade: number, count = 10, rng: Rng = createRng()): Question[] => {
  const topics = topicsUpTo(subject, grade).filter((tp) => tp.id !== 'essay-writing');
  const used = new Set<string>();
  const out: Omit<Question, 'id'>[] = [];
  for (let i = 0; i < count * 4 && out.length < count; i++) {
    const q = questionForTopic(pick(rng, topics), rng, used, false);
    if (q) out.push(q);
  }
  return withIds(out);
};

/**
 * A full exam for a grade & subject: 20 questions drawn from the student's grade and earlier,
 * weighted towards the current grade. English exams end with one essay question.
 */
export const buildExam = (subject: Subject, grade: number, rng: Rng, size = 20): Question[] => {
  const all = topicsUpTo(subject, grade).filter((tp) => tp.id !== 'essay-writing');
  const current = all.filter((tp) => tp.grade === grade);
  const used = new Set<string>();
  const out: Omit<Question, 'id'>[] = [];
  const objectiveCount = subject === 'ENGLISH' ? size - 1 : size;
  for (let i = 0; i < objectiveCount * 5 && out.length < objectiveCount; i++) {
    const pool = current.length && rng() < 0.6 ? current : all;
    const q = questionForTopic(pick(rng, pool), rng, used, false);
    if (q) out.push(q);
  }
  if (subject === 'ENGLISH') {
    const essayTopic = getTopic('essay-writing');
    const essay = essayTopic && questionForTopic(essayTopic, rng, used, true);
    if (essay) out.push(essay);
  }
  return withIds(out);
};

export const defaultExamTitle = (subject: Subject, grade: number) => `Grade ${grade} ${SUBJECT_INFO[subject].label} Exam`;

// ---------------------------------------------------------------------------
// PDF-based practice generation
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(
  'about above after again against all also although among and another any are around because been before being below between both but can cannot could did does doing down during each either every few for from further had has have having her here hers herself him himself his how however into its itself just like made make many more most much must myself never not now off once only other our ours over own same she should since some such than that the their theirs them themselves then there these they this those through too under until upon very was were what when where which while who whom why will with within without would you your yours'.split(
    ' ',
  ),
);

const splitSentences = (text: string): string[] =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 300 && /[a-z]/i.test(s));

const contentWords = (sentence: string): string[] =>
  (sentence.match(/[A-Za-z][A-Za-z-]{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w.toLowerCase()));

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Sentences of the document that mention the topic (by name or keyword). */
export const findTopicSentences = (text: string, topic: string, extraKeywords: string[] = []): string[] => {
  const needles = [topic, ...extraKeywords]
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 3);
  if (!needles.length) return [];
  const sentences = splitSentences(text);
  // Prefer an exact topic-name match; fall back to keywords.
  const exact = sentences.filter((s) => s.toLowerCase().includes(needles[0]));
  if (exact.length) return exact;
  return sentences.filter((s) => needles.some((n) => new RegExp(`\\b${escapeRegex(n)}`, 'i').test(s)));
};

/**
 * Generate fill-in-the-blank questions from sentences in an uploaded PDF that mention the topic.
 * Throws TopicNotFoundError when the topic is not in the document (FR9).
 */
export const buildPracticeFromText = (
  text: string,
  topicName: string,
  count = 8,
  rng: Rng = createRng(),
): Question[] => {
  const curriculumTopic = getTopic(topicName) ?? undefined;
  const label = curriculumTopic?.name ?? topicName;
  const sentences = findTopicSentences(text, label, curriculumTopic?.keywords ?? []);
  if (!sentences.length) {
    throw new TopicNotFoundError(
      `The topic "${label}" was not found in this PDF. Please choose a different topic or upload a PDF that covers it.`,
    );
  }
  const vocabulary = [...new Set(splitSentences(text).flatMap(contentWords))];
  const out: Omit<Question, 'id'>[] = [];
  for (const sentence of shuffle(rng, sentences)) {
    if (out.length >= count) break;
    const words = contentWords(sentence).filter((w) => w.length >= 5);
    if (!words.length) continue;
    // Blank out the longest content word – usually the most meaningful term.
    const target = [...words].sort((a, b) => b.length - a.length)[0];
    const distractors = shuffle(
      rng,
      vocabulary.filter((w) => w.toLowerCase() !== target.toLowerCase() && Math.abs(w.length - target.length) <= 4),
    ).slice(0, 3);
    if (distractors.length < 3) continue;
    // Blank every occurrence so the answer is not given away elsewhere in the sentence.
    const blanked = sentence.replace(new RegExp(`\\b${escapeRegex(target)}\\b`, 'gi'), '_____');
    out.push({
      type: 'mcq',
      prompt: `Fill in the blank: ${blanked}`,
      options: shuffle(rng, [target, ...distractors]),
      answer: target,
      explanation: `From your study material: "${sentence}"`,
      topic: curriculumTopic?.id ?? topicName,
    });
  }
  if (!out.length) {
    throw new TopicNotFoundError(
      `This PDF mentions "${label}" but not in enough detail to make questions. Please upload a PDF with more content on this topic.`,
    );
  }
  return withIds(out);
};

export { topicsFor };
