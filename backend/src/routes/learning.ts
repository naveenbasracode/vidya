// Practice sets (FR8, FR9), essay grading (FR11) and timed exams (FR10).
import { Router } from 'express';
import type { Prisma, Subject } from '@prisma/client';
import { prisma } from '../db.js';
import { ah, badRequest, HttpError, notFound, int } from '../lib/http.js';
import { isSubject, SUBJECT_INFO, toPublic, type Question } from '../domain/types.js';
import { getTopic, topicsFor } from '../domain/curriculum.js';
import { buildMixedPractice, buildPractice, buildPracticeFromText, TopicNotFoundError } from '../domain/questions.js';
import { gradeSet } from '../domain/grading.js';
import { createRng } from '../domain/random.js';
import { alertOnScore, replanAfterScore } from '../services/students.js';

export const learningRouter = Router({ mergeParams: true });

const sid = (res: { locals: { student?: { id: string } } }) => res.locals.student!.id;
const json = (v: unknown) => v as Prisma.InputJsonValue;

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------

/** Topics available for practice: the built-in curriculum plus uploaded PDFs per subject. */
learningRouter.get(
  '/practice/topics',
  ah(async (_req, res) => {
    const grade = res.locals.student!.grade ?? 5;
    const documents = await prisma.document.findMany({
      select: { id: true, subject: true, grade: true, originalName: true, pageCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      grade,
      subjects: (Object.keys(SUBJECT_INFO) as Subject[]).map((subject) => ({
        subject,
        ...SUBJECT_INFO[subject],
        topics: topicsFor(subject).map((t) => ({ id: t.id, name: t.name, grade: t.grade })),
        documents: documents.filter((d) => d.subject === subject),
      })),
    });
  }),
);

const setForClient = (set: { id: string; subject: Subject; topic: string; topicName: string; source: string; questions: unknown; createdAt: Date; submittedAt: Date | null; score: number | null; result: unknown; createdById: string | null }, studentId: string) => ({
  id: set.id,
  subject: set.subject,
  topic: set.topic,
  topicName: set.topicName,
  source: set.source,
  createdAt: set.createdAt,
  submittedAt: set.submittedAt,
  score: set.score,
  assigned: !!set.createdById && set.createdById !== studentId,
  questions: (set.questions as Question[]).map(toPublic),
  result: set.result ?? null,
});

/**
 * Generate a practice set.
 * body: { subject, topicId?, topicText?, source: 'curriculum' | 'document', documentId?, count? }
 * A parent generating a set for their child "assigns" it.
 */
learningRouter.post(
  '/practice',
  ah(async (req, res) => {
    const { subject, topicId, topicText, source = 'curriculum', documentId } = req.body ?? {};
    if (!isSubject(subject)) throw badRequest('Please choose a subject.');
    const count = int(Number(req.body.count ?? 10), 'count', 1, 30);
    const rng = createRng();
    let questions: Question[];
    let topic: string;
    let topicName: string;

    try {
      if (source === 'document') {
        if (!documentId) throw badRequest('Please choose a PDF.');
        const doc = await prisma.document.findUnique({ where: { id: String(documentId) } });
        if (!doc) throw notFound('That PDF no longer exists.');
        const wanted = (topicText ? String(topicText) : topicId ? String(topicId) : '').trim();
        if (!wanted) throw badRequest('Please choose or type a topic.');
        const ct = getTopic(wanted);
        topic = ct?.id ?? wanted.toLowerCase();
        topicName = ct?.name ?? wanted;
        if (!doc.text.trim()) throw new TopicNotFoundError('No readable text was found in this PDF (it may be a scanned image). Please upload a different PDF.');
        questions = buildPracticeFromText(doc.text, wanted, count, rng);
      } else if (topicId === 'mixed' || !topicId) {
        topic = 'mixed';
        topicName = `Mixed ${SUBJECT_INFO[subject].label}`;
        questions = buildMixedPractice(subject, res.locals.student!.grade ?? 5, count, rng);
      } else {
        const ct = getTopic(String(topicId));
        if (!ct || ct.subject !== subject) throw badRequest('That topic is not part of this subject.');
        topic = ct.id;
        topicName = ct.name;
        questions = buildPractice(ct.id, count, rng);
      }
    } catch (e) {
      if (e instanceof TopicNotFoundError) throw new HttpError(422, e.message);
      throw e;
    }
    if (!questions.length) throw new HttpError(422, 'Could not generate questions for that topic.');

    const set = await prisma.practiceSet.create({
      data: {
        studentId: sid(res),
        createdById: req.user!.id,
        subject,
        topic,
        topicName,
        source: source === 'document' ? 'document' : 'curriculum',
        documentId: source === 'document' ? String(documentId) : null,
        questions: json(questions),
      },
    });
    res.status(201).json({ set: setForClient(set, sid(res)) });
  }),
);

learningRouter.get(
  '/practice',
  ah(async (_req, res) => {
    const sets = await prisma.practiceSet.findMany({ where: { studentId: sid(res) }, orderBy: { createdAt: 'desc' }, take: 30 });
    res.json({
      sets: sets.map((s) => {
        const c = setForClient(s, sid(res));
        return { ...c, questions: undefined, questionCount: c.questions.length, result: undefined };
      }),
    });
  }),
);

learningRouter.get(
  '/practice/:setId',
  ah(async (req, res) => {
    const set = await prisma.practiceSet.findFirst({ where: { id: req.params.setId, studentId: sid(res) } });
    if (!set) throw notFound('Practice set not found.');
    res.json({ set: setForClient(set, sid(res)) });
  }),
);

learningRouter.post(
  '/practice/:setId/submit',
  ah(async (req, res) => {
    const set = await prisma.practiceSet.findFirst({ where: { id: req.params.setId, studentId: sid(res) } });
    if (!set) throw notFound('Practice set not found.');
    if (set.submittedAt) throw badRequest('This practice set has already been submitted.');
    if (req.user!.role !== 'STUDENT' && req.user!.role !== 'ADMIN') throw new HttpError(403, 'Only the student can submit answers.');
    const answers = (req.body?.answers ?? {}) as Record<string, unknown>;
    const questions = set.questions as unknown as Question[];
    const graded = gradeSet(questions, answers);
    const isEssay = questions.some((q) => q.type === 'essay');
    const updated = await prisma.practiceSet.update({
      where: { id: set.id },
      data: { answers: json(answers), result: json(graded), score: graded.score, submittedAt: new Date() },
    });
    await prisma.score.create({
      data: {
        studentId: sid(res),
        subject: set.subject,
        kind: isEssay ? 'ESSAY' : 'PRACTICE',
        topic: set.topic,
        score: graded.score,
        details: json({ practiceSetId: set.id, topicName: set.topicName }),
      },
    });
    await replanAfterScore(sid(res));
    await alertOnScore(sid(res), set.subject, graded.score, `${isEssay ? 'Essay' : 'Practice'} – ${set.topicName}`);
    res.json({ set: setForClient(updated, sid(res)) });
  }),
);

// ---------------------------------------------------------------------------
// Exams – four 45-minute exams per grade (one per subject)
// ---------------------------------------------------------------------------

const deadlineOf = (startedAt: Date, minutes: number) => new Date(startedAt.getTime() + minutes * 60_000);
const GRACE_MS = 2 * 60_000;

learningRouter.get(
  '/exams',
  ah(async (_req, res) => {
    const grade = res.locals.student!.grade ?? 5;
    const exams = await prisma.exam.findMany({
      where: { grade, active: true },
      orderBy: { position: 'asc' },
      include: { attempts: { where: { studentId: sid(res) }, orderBy: { startedAt: 'desc' } } },
    });
    res.json({
      grade,
      exams: exams.map((e) => {
        const done = e.attempts.filter((a) => a.submittedAt);
        const open = e.attempts.find((a) => !a.submittedAt && deadlineOf(a.startedAt, e.durationMinutes).getTime() > Date.now());
        return {
          id: e.id,
          title: e.title,
          subject: e.subject,
          ...SUBJECT_INFO[e.subject],
          durationMinutes: e.durationMinutes,
          questionCount: (e.questions as unknown[]).length,
          attempts: done.map((a) => ({ id: a.id, score: a.score, submittedAt: a.submittedAt, timedOut: a.timedOut })),
          bestScore: done.length ? Math.max(...done.map((a) => a.score ?? 0)) : null,
          inProgressAttemptId: open?.id ?? null,
        };
      }),
    });
  }),
);

/** Start (or resume) an exam. The server keeps the clock so the 45 minutes are enforced. */
learningRouter.post(
  '/exams/:examId/start',
  ah(async (req, res) => {
    if (req.user!.role !== 'STUDENT') throw new HttpError(403, 'Only the student can sit an exam.');
    const exam = await prisma.exam.findFirst({ where: { id: req.params.examId, active: true } });
    if (!exam) throw notFound('Exam not found.');
    const now = Date.now();
    let attempt = await prisma.examAttempt.findFirst({ where: { examId: exam.id, studentId: sid(res), submittedAt: null }, orderBy: { startedAt: 'desc' } });
    if (!attempt || deadlineOf(attempt.startedAt, exam.durationMinutes).getTime() <= now) {
      attempt = await prisma.examAttempt.create({ data: { examId: exam.id, studentId: sid(res) } });
    }
    const deadline = deadlineOf(attempt.startedAt, exam.durationMinutes);
    res.json({
      attempt: { id: attempt.id, startedAt: attempt.startedAt, deadline, serverNow: new Date(now) },
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        questions: (exam.questions as unknown as Question[]).map(toPublic),
      },
    });
  }),
);

learningRouter.post(
  '/exams/attempts/:attemptId/submit',
  ah(async (req, res) => {
    const attempt = await prisma.examAttempt.findFirst({ where: { id: req.params.attemptId, studentId: sid(res) }, include: { exam: true } });
    if (!attempt) throw notFound('Exam attempt not found.');
    if (attempt.submittedAt) throw badRequest('This exam has already been submitted.');
    const now = new Date();
    const deadline = deadlineOf(attempt.startedAt, attempt.exam.durationMinutes);
    const timedOut = now.getTime() > deadline.getTime() + GRACE_MS;
    const answers = (req.body?.answers ?? {}) as Record<string, unknown>;
    const graded = gradeSet(attempt.exam.questions as unknown as Question[], answers);
    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { submittedAt: now, answers: json(answers), result: json(graded), score: graded.score, timedOut },
    });
    await prisma.score.create({
      data: {
        studentId: sid(res),
        subject: attempt.exam.subject,
        kind: 'EXAM',
        topic: null,
        score: graded.score,
        details: json({ examId: attempt.examId, attemptId: attempt.id, title: attempt.exam.title }),
      },
    });
    await replanAfterScore(sid(res));
    await alertOnScore(sid(res), attempt.exam.subject, graded.score, attempt.exam.title);
    res.json({ attempt: { id: updated.id, score: updated.score, timedOut, submittedAt: updated.submittedAt }, result: graded, questions: attempt.exam.questions });
  }),
);

learningRouter.get(
  '/exams/attempts/:attemptId',
  ah(async (req, res) => {
    const attempt = await prisma.examAttempt.findFirst({ where: { id: req.params.attemptId, studentId: sid(res) }, include: { exam: true } });
    if (!attempt || !attempt.submittedAt) throw notFound('Exam result not found.');
    res.json({
      attempt: { id: attempt.id, score: attempt.score, timedOut: attempt.timedOut, submittedAt: attempt.submittedAt },
      exam: { id: attempt.exam.id, title: attempt.exam.title, subject: attempt.exam.subject },
      result: attempt.result,
      questions: attempt.exam.questions,
    });
  }),
);
