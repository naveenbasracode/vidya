// Content management (FR7, FR15): curriculum PDFs and the 3-year exam bank.
import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ah, badRequest, notFound, int, str } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { config } from '../config.js';
import { deleteFile, ensureStorageDirectory, getFilePath } from '../lib/storage.js';
import { extractPdfText } from '../lib/pdf.js';
import { isSubject, SUBJECT_INFO, type Question } from '../domain/types.js';
import { TOPICS } from '../domain/curriculum.js';
import { buildExam, defaultExamTitle } from '../domain/questions.js';
import { createRng } from '../domain/random.js';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('ADMIN'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (ok) cb(null, true);
    else cb(badRequest('Only PDF files can be uploaded.'));
  },
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

adminRouter.get(
  '/documents',
  ah(async (_req, res) => {
    const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({
      documents: docs.map(({ text, ...d }) => ({
        ...d,
        characters: text.length,
        // which curriculum topics this PDF appears to cover
        topicsFound: TOPICS.filter((t) => t.subject === d.subject && t.keywords.some((k) => text.toLowerCase().includes(k))).map((t) => t.name),
      })),
    });
  }),
);

adminRouter.post(
  '/documents',
  upload.single('file'),
  ah(async (req, res) => {
    if (!req.file) throw badRequest('Please choose a PDF file.');
    const subject = req.body.subject;
    if (!isSubject(subject)) throw badRequest('Please choose a subject.');
    const grade = req.body.grade ? int(Number(req.body.grade), 'grade', 5, 7) : null;
    if (req.file.buffer.subarray(0, 5).toString() !== '%PDF-') throw badRequest('That file does not look like a PDF.');

    ensureStorageDirectory();
    const storedName = `${crypto.randomUUID()}.pdf`;
    fs.writeFileSync(getFilePath(storedName), req.file.buffer);

    let text = '';
    let pageCount = 0;
    let warning: string | undefined;
    try {
      ({ text, pageCount } = await extractPdfText(new Uint8Array(req.file.buffer)));
      if (!text.trim()) warning = 'No text could be read from this PDF (it may be scanned images). Practice questions cannot be generated from it.';
    } catch (e) {
      console.error('PDF text extraction failed', e);
      warning = 'The PDF was saved but its text could not be read.';
    }

    const doc = await prisma.document.create({
      data: { subject, grade, originalName: req.file.originalname, storedName, sizeBytes: req.file.size, pageCount, text, uploadedById: req.user!.id },
    });
    res.status(201).json({ document: { ...doc, text: undefined, characters: text.length }, warning });
  }),
);

adminRouter.get(
  '/documents/:id/file',
  ah(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound('Document not found.');
    res.download(getFilePath(doc.storedName), doc.originalName);
  }),
);

adminRouter.delete(
  '/documents/:id',
  ah(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound('Document not found.');
    await prisma.document.delete({ where: { id: doc.id } });
    deleteFile(doc.storedName);
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Exam bank
// ---------------------------------------------------------------------------

adminRouter.get(
  '/exams',
  ah(async (req, res) => {
    const grade = req.query.grade ? int(Number(req.query.grade), 'grade', 5, 7) : undefined;
    const exams = await prisma.exam.findMany({ where: { grade }, orderBy: [{ grade: 'asc' }, { position: 'asc' }], include: { _count: { select: { attempts: { where: { submittedAt: { not: null } } } } } } });
    res.json({ exams: exams.map((e) => ({ ...e, ...SUBJECT_INFO[e.subject], attemptCount: e._count.attempts })) });
  }),
);

const validateQuestions = (raw: unknown): Question[] => {
  if (!Array.isArray(raw) || !raw.length) throw badRequest('An exam needs at least one question.');
  const ids = new Set<string>();
  return raw.map((q: Partial<Question>, i: number) => {
    const where = `Question ${i + 1}`;
    if (!q || typeof q !== 'object') throw badRequest(`${where} is invalid.`);
    if (!['mcq', 'number', 'text', 'essay'].includes(String(q.type))) throw badRequest(`${where}: type must be mcq, number, text or essay.`);
    if (!q.prompt || typeof q.prompt !== 'string') throw badRequest(`${where}: prompt is required.`);
    const id = q.id && typeof q.id === 'string' ? q.id : `q${i + 1}`;
    if (ids.has(id)) throw badRequest(`${where}: duplicate id "${id}".`);
    ids.add(id);
    if (q.type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length < 2) throw badRequest(`${where}: multiple choice needs at least 2 options.`);
      if (!q.options.map(String).includes(String(q.answer))) throw badRequest(`${where}: the answer must be one of the options.`);
    }
    if (q.type === 'number' && (q.answer === undefined || Number.isNaN(Number(q.answer)))) throw badRequest(`${where}: answer must be a number.`);
    if (q.type === 'text' && (q.answer === undefined || String(q.answer).trim() === '')) throw badRequest(`${where}: answer is required.`);
    return {
      id,
      type: q.type!,
      prompt: q.prompt,
      options: q.type === 'mcq' ? q.options!.map(String) : undefined,
      answer: q.type === 'number' ? Number(q.answer) : q.type === 'essay' ? undefined : String(q.answer),
      explanation: q.explanation,
      topic: q.topic,
      minWords: q.type === 'essay' ? Number(q.minWords ?? 120) : undefined,
      keywords: q.type === 'essay' ? (q.keywords ?? []).map(String) : undefined,
    } as Question;
  });
};

adminRouter.put(
  '/exams/:id',
  ah(async (req, res) => {
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) throw notFound('Exam not found.');
    const data: Prisma.ExamUpdateInput = {};
    if (req.body.title !== undefined) data.title = str(req.body, 'title', { required: true, max: 120 });
    if (req.body.durationMinutes !== undefined) data.durationMinutes = int(Number(req.body.durationMinutes), 'durationMinutes', 5, 180);
    if (req.body.active !== undefined) data.active = Boolean(req.body.active);
    if (req.body.questions !== undefined) data.questions = validateQuestions(req.body.questions) as unknown as Prisma.InputJsonValue;
    res.json({ exam: await prisma.exam.update({ where: { id: exam.id }, data }) });
  }),
);

/** Replace an exam's questions with a freshly generated set from the curriculum. */
adminRouter.post(
  '/exams/:id/regenerate',
  ah(async (req, res) => {
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) throw notFound('Exam not found.');
    const questions = buildExam(exam.subject, exam.grade, createRng());
    res.json({ exam: await prisma.exam.update({ where: { id: exam.id }, data: { questions: questions as unknown as Prisma.InputJsonValue } }) });
  }),
);

/** Create the default four exams for a grade if they are missing. */
export const ensureDefaultExams = async () => {
  const subjects = ['MATHS', 'ENGLISH', 'VERBAL', 'QUANTITATIVE'] as const;
  let created = 0;
  for (const grade of [5, 6, 7]) {
    for (const [position, subject] of subjects.entries()) {
      const exists = await prisma.exam.findFirst({ where: { grade, subject } });
      if (exists) continue;
      await prisma.exam.create({
        data: {
          grade,
          subject,
          position,
          title: defaultExamTitle(subject, grade),
          durationMinutes: 45,
          questions: buildExam(subject, grade, createRng(grade * 1000 + position)) as unknown as Prisma.InputJsonValue,
        },
      });
      created++;
    }
  }
  return created;
};
