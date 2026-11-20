export type Subject = 'MATHS' | 'ENGLISH' | 'VERBAL' | 'QUANTITATIVE';

export const SUBJECTS: Subject[] = ['MATHS', 'ENGLISH', 'VERBAL', 'QUANTITATIVE'];

export const SUBJECT_INFO: Record<Subject, { label: string; emoji: string; color: string }> = {
  MATHS: { label: 'Maths', emoji: '🔢', color: '#0f62fe' },
  ENGLISH: { label: 'English', emoji: '📚', color: '#8a3ffc' },
  VERBAL: { label: 'Verbal Reasoning', emoji: '🧩', color: '#007d79' },
  QUANTITATIVE: { label: 'Quantitative Reasoning', emoji: '📊', color: '#d12771' },
};

export const isSubject = (s: unknown): s is Subject => typeof s === 'string' && (SUBJECTS as string[]).includes(s);

export type QuestionType = 'mcq' | 'number' | 'text' | 'essay';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  /** Correct answer: option text for mcq, number for number, string for text. Absent for essay. */
  answer?: string | number;
  explanation?: string;
  topic?: string;
  /** Essay only */
  minWords?: number;
  keywords?: string[];
}

/** Questions as sent to the student (answers removed). */
export type PublicQuestion = Omit<Question, 'answer' | 'explanation'>;

export const toPublic = (q: Question): PublicQuestion => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { answer, explanation, ...rest } = q;
  return rest;
};

export type Status = 'GREEN' | 'AMBER' | 'RED';
