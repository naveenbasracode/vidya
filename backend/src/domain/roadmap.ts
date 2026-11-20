// 3-year holistic plan (FR14): static curriculum that adapts to the student's progress.
import type { Subject } from './types.js';
import { SUBJECTS, SUBJECT_INFO } from './types.js';
import { TOPICS } from './curriculum.js';
import { AMBER_MIN } from './achievements.js';

export type TopicState = 'mastered' | 'in-progress' | 'not-started';

export interface TopicScore {
  topic: string | null;
  subject: Subject;
  score: number;
}

export interface RoadmapTopic {
  id: string;
  name: string;
  state: TopicState;
  average: number | null;
  attempts: number;
}

export interface RoadmapGrade {
  grade: number;
  phase: 'past' | 'current' | 'future';
  progress: number; // 0-100 share of topics mastered
  subjects: { subject: Subject; label: string; emoji: string; progress: number; topics: RoadmapTopic[] }[];
  milestone: string;
}

export interface Roadmap {
  currentGrade: number;
  grades: RoadmapGrade[];
  nextSteps: string[];
}

const MILESTONES: Record<number, string> = {
  5: 'Strong foundations: number skills, reading fluency and core reasoning',
  6: 'Building confidence: fractions, percentages, ratios and structured writing',
  7: 'Ready for secondary: algebra, probability, analysis and exam technique',
};

export const buildRoadmap = (currentGrade: number, scores: TopicScore[]): Roadmap => {
  const grade = Math.max(5, Math.min(7, currentGrade || 5));
  const topicStats = new Map<string, { sum: number; n: number }>();
  for (const s of scores) {
    if (!s.topic) continue;
    const st = topicStats.get(s.topic) ?? { sum: 0, n: 0 };
    st.sum += s.score;
    st.n += 1;
    topicStats.set(s.topic, st);
  }

  const grades: RoadmapGrade[] = [5, 6, 7].map((g) => {
    const subjects = SUBJECTS.map((subject) => {
      const topics: RoadmapTopic[] = TOPICS.filter((tp) => tp.grade === g && tp.subject === subject).map((tp) => {
        const st = topicStats.get(tp.id);
        const average = st ? Math.round((st.sum / st.n) * 10) / 10 : null;
        const state: TopicState = !st ? 'not-started' : average! >= AMBER_MIN ? 'mastered' : 'in-progress';
        return { id: tp.id, name: tp.name, state, average, attempts: st?.n ?? 0 };
      });
      const mastered = topics.filter((x) => x.state === 'mastered').length;
      return {
        subject,
        label: SUBJECT_INFO[subject].label,
        emoji: SUBJECT_INFO[subject].emoji,
        progress: topics.length ? Math.round((mastered / topics.length) * 100) : 0,
        topics,
      };
    });
    const all = subjects.flatMap((s) => s.topics);
    return {
      grade: g,
      phase: g < grade ? 'past' : g === grade ? 'current' : 'future',
      progress: all.length ? Math.round((all.filter((x) => x.state === 'mastered').length / all.length) * 100) : 0,
      subjects,
      milestone: MILESTONES[g],
    };
  });

  // Adaptive next steps
  const nextSteps: string[] = [];
  const current = grades.find((g) => g.grade === grade)!;
  for (const s of current.subjects) {
    const weak = s.topics.filter((x) => x.state === 'in-progress');
    const todo = s.topics.filter((x) => x.state === 'not-started');
    if (weak.length) nextSteps.push(`${s.emoji} Revise ${weak.map((w) => w.name).join(', ')} in ${s.label}.`);
    else if (todo.length) nextSteps.push(`${s.emoji} Start ${todo[0].name} in ${s.label}.`);
    else if (grade < 7) {
      const next = grades.find((g) => g.grade === grade + 1)!.subjects.find((x) => x.subject === s.subject)!;
      const upcoming = next.topics.find((x) => x.state !== 'mastered');
      if (upcoming) nextSteps.push(`${s.emoji} You've mastered Grade ${grade} ${s.label} — try Grade ${grade + 1}: ${upcoming.name}!`);
    } else nextSteps.push(`${s.emoji} ${s.label} complete — keep practising with full exams.`);
  }
  // Revisit earlier-grade gaps
  for (const g of grades.filter((x) => x.phase === 'past')) {
    for (const s of g.subjects) {
      const weak = s.topics.filter((x) => x.state === 'in-progress');
      if (weak.length) nextSteps.push(`${s.emoji} Fill a gap from Grade ${g.grade}: ${weak.map((w) => w.name).join(', ')}.`);
    }
  }
  return { currentGrade: grade, grades, nextSteps };
};
