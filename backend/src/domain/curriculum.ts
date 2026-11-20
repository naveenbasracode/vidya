// The static 3-year curriculum (Grades 5-7). The roadmap and practice topics are built from this.
import type { Subject } from './types.js';

export interface Topic {
  id: string;
  name: string;
  subject: Subject;
  grade: 5 | 6 | 7;
  /** Words used to find this topic inside uploaded curriculum PDFs. */
  keywords: string[];
}

const t = (subject: Subject, grade: 5 | 6 | 7, id: string, name: string, keywords: string[] = []): Topic => ({
  id,
  name,
  subject,
  grade,
  keywords: [name.toLowerCase(), ...keywords],
});

export const TOPICS: Topic[] = [
  // Maths
  t('MATHS', 5, 'place-value', 'Place value & rounding', ['rounding', 'place value']),
  t('MATHS', 5, 'multiplication', 'Multiplication', ['multiply', 'times', 'product']),
  t('MATHS', 5, 'division', 'Division', ['divide', 'quotient']),
  t('MATHS', 5, 'fractions', 'Fractions', ['fraction', 'numerator', 'denominator']),
  t('MATHS', 5, 'decimals', 'Decimals', ['decimal']),
  t('MATHS', 5, 'perimeter-area', 'Perimeter & area', ['perimeter', 'area', 'rectangle']),
  t('MATHS', 6, 'fraction-operations', 'Adding & subtracting fractions', ['fraction', 'common denominator']),
  t('MATHS', 6, 'percentages', 'Percentages', ['percent', 'percentage']),
  t('MATHS', 6, 'ratios', 'Ratios', ['ratio', 'proportion']),
  t('MATHS', 6, 'order-of-operations', 'Order of operations', ['bodmas', 'bidmas', 'pemdas', 'order of operations']),
  t('MATHS', 6, 'integers', 'Negative numbers', ['integer', 'negative']),
  t('MATHS', 6, 'triangle-area', 'Area of triangles', ['triangle', 'area']),
  t('MATHS', 7, 'algebraic-expressions', 'Algebraic expressions', ['algebra', 'expression', 'variable', 'substitute']),
  t('MATHS', 7, 'linear-equations', 'Linear equations', ['equation', 'solve', 'algebra']),
  t('MATHS', 7, 'percent-change', 'Percentage change', ['percentage increase', 'percentage decrease', 'percent']),
  t('MATHS', 7, 'probability', 'Probability', ['probability', 'chance', 'likely']),

  // English
  t('ENGLISH', 5, 'parts-of-speech', 'Parts of speech', ['noun', 'verb', 'adjective', 'adverb']),
  t('ENGLISH', 5, 'spelling', 'Spelling', ['spell', 'spelling']),
  t('ENGLISH', 5, 'tenses', 'Verb tenses', ['tense', 'past', 'present', 'future']),
  t('ENGLISH', 5, 'comprehension', 'Reading comprehension', ['comprehension', 'passage', 'read']),
  t('ENGLISH', 6, 'punctuation', 'Punctuation', ['punctuation', 'comma', 'apostrophe']),
  t('ENGLISH', 6, 'vocabulary', 'Vocabulary', ['vocabulary', 'meaning', 'definition']),
  t('ENGLISH', 6, 'essay-writing', 'Essay writing', ['essay', 'paragraph', 'writing']),
  t('ENGLISH', 7, 'figurative-language', 'Figurative language', ['simile', 'metaphor', 'personification']),

  // Verbal reasoning
  t('VERBAL', 5, 'synonyms', 'Synonyms', ['synonym', 'same meaning']),
  t('VERBAL', 5, 'antonyms', 'Antonyms', ['antonym', 'opposite']),
  t('VERBAL', 5, 'letter-series', 'Letter series', ['letter', 'series', 'alphabet']),
  t('VERBAL', 6, 'analogies', 'Analogies', ['analogy', 'is to']),
  t('VERBAL', 6, 'odd-one-out', 'Odd one out', ['odd one out', 'does not belong']),
  t('VERBAL', 7, 'codes', 'Letter codes', ['code', 'cipher']),
  t('VERBAL', 7, 'word-classification', 'Word classification', ['classify', 'group', 'category']),

  // Quantitative reasoning
  t('QUANTITATIVE', 5, 'number-series', 'Number series', ['sequence', 'series', 'pattern']),
  t('QUANTITATIVE', 5, 'time-problems', 'Time problems', ['time', 'clock', 'duration']),
  t('QUANTITATIVE', 5, 'word-problems', 'Money word problems', ['money', 'cost', 'change']),
  t('QUANTITATIVE', 6, 'averages', 'Averages', ['average', 'mean']),
  t('QUANTITATIVE', 6, 'data-interpretation', 'Data interpretation', ['table', 'chart', 'graph', 'data']),
  t('QUANTITATIVE', 7, 'speed-distance-time', 'Speed, distance & time', ['speed', 'distance', 'km/h']),
];

export const getTopic = (id: string) => TOPICS.find((tp) => tp.id === id);

export const topicsFor = (subject: Subject, grade?: number) =>
  TOPICS.filter((tp) => tp.subject === subject && (grade === undefined || tp.grade === grade));

/** Topics a student at `grade` should already have covered (their grade and below, within 5-7). */
export const topicsUpTo = (subject: Subject, grade: number) =>
  TOPICS.filter((tp) => tp.subject === subject && tp.grade <= Math.max(5, Math.min(7, grade)));
