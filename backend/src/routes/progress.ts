// Achievement dashboard (FR12), alerts (FR13) and the 3-year roadmap (FR14).
import { Router } from 'express';
import { prisma } from '../db.js';
import { ah } from '../lib/http.js';
import { isValidDate, startOfWeek, todayLocal } from '../lib/dates.js';
import { previousWeeks, statusFor } from '../domain/achievements.js';
import { buildRoadmap } from '../domain/roadmap.js';
import { SUBJECTS, SUBJECT_INFO } from '../domain/types.js';
import { getSubjectAverages, getWeeklySummary, runAlertChecks } from '../services/students.js';

export const progressRouter = Router({ mergeParams: true });

const sid = (res: { locals: { student?: { id: string } } }) => res.locals.student!.id;
const today = (q: unknown) => (isValidDate(q) ? q : todayLocal());

progressRouter.get(
  '/achievements',
  ah(async (req, res) => {
    const t = today(req.query.today);
    const weekStart = startOfWeek(isValidDate(req.query.weekStart) ? req.query.weekStart : t);
    const weeks = previousWeeks(weekStart, 6);
    const [summary, history, averages, recent] = await Promise.all([
      getWeeklySummary(sid(res), weekStart, t),
      Promise.all(weeks.map((w) => getWeeklySummary(sid(res), w, t))),
      getSubjectAverages(sid(res)),
      prisma.score.findMany({ where: { studentId: sid(res) }, orderBy: { createdAt: 'desc' }, take: 15 }),
    ]);
    res.json({
      summary,
      history: history.map((h) => ({
        weekStart: h.weekStart,
        academic: h.academic.percent,
        activity: h.activity.percent,
      })),
      overall: SUBJECTS.map((s) => ({
        subject: s,
        ...SUBJECT_INFO[s],
        average: averages[s] ?? null,
        status: averages[s] === undefined ? null : statusFor(averages[s]!),
      })),
      recent: recent.map((r) => ({
        id: r.id,
        subject: r.subject,
        kind: r.kind,
        score: r.score,
        status: statusFor(r.score),
        label: (r.details as { title?: string; topicName?: string } | null)?.title ?? (r.details as { topicName?: string } | null)?.topicName ?? r.topic,
        createdAt: r.createdAt,
      })),
    });
  }),
);

progressRouter.get(
  '/roadmap',
  ah(async (_req, res) => {
    const scores = await prisma.score.findMany({ where: { studentId: sid(res), topic: { not: null } } });
    res.json(buildRoadmap(res.locals.student!.grade ?? 5, scores));
  }),
);

progressRouter.get(
  '/notifications',
  ah(async (req, res) => {
    await runAlertChecks(sid(res), today(req.query.today));
    const notifications = await prisma.notification.findMany({ where: { studentId: sid(res) }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
  }),
);

progressRouter.post(
  '/notifications/read-all',
  ah(async (_req, res) => {
    await prisma.notification.updateMany({ where: { studentId: sid(res), read: false }, data: { read: true } });
    res.status(204).end();
  }),
);

progressRouter.post(
  '/notifications/:id/read',
  ah(async (req, res) => {
    await prisma.notification.updateMany({ where: { id: req.params.id, studentId: sid(res) }, data: { read: true } });
    res.status(204).end();
  }),
);
