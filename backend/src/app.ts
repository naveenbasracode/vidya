import express, { type Application } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { familyRouter } from './routes/family.js';
import { plannerRouter } from './routes/planner.js';
import { learningRouter } from './routes/learning.js';
import { progressRouter } from './routes/progress.js';
import { adminRouter } from './routes/admin.js';
import { authenticate, loadStudent } from './middleware/auth.js';
import { errorHandler } from './lib/http.js';
import { SUBJECT_INFO } from './domain/types.js';
import { TOPICS } from './domain/curriculum.js';

export const createApp = (): Application => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/curriculum', (_req, res) => res.json({ subjects: SUBJECT_INFO, topics: TOPICS }));

  app.use('/api/auth', authRouter);
  app.use('/api/family', familyRouter);
  app.use('/api/admin', adminRouter);

  // Everything about one student: /api/students/me/... or /api/students/<id>/...
  const student = express.Router({ mergeParams: true });
  student.use(plannerRouter, learningRouter, progressRouter);
  app.use('/api/students/:studentId', authenticate, loadStudent, student);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
};

export default createApp;
