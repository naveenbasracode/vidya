// Parent ↔ student links. A parent adds a child by the email the child registered with.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { ah, badRequest, HttpError, notFound, str, int } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { publicUser } from './auth.js';
import { createDefaultHabits } from '../services/students.js';

export const familyRouter = Router();
familyRouter.use(authenticate, authorize('PARENT', 'ADMIN'));

familyRouter.get(
  '/children',
  ah(async (req, res) => {
    const students =
      req.user!.role === 'ADMIN'
        ? await prisma.user.findMany({ where: { role: 'STUDENT' }, orderBy: { name: 'asc' } })
        : (await prisma.parentLink.findMany({ where: { parentId: req.user!.id }, include: { student: true } })).map((l) => l.student);
    res.json({ children: students.map(publicUser) });
  }),
);

/** Link an existing student account. */
familyRouter.post(
  '/children/link',
  ah(async (req, res) => {
    const email = str(req.body, 'email', { required: true })!.toLowerCase();
    const student = await prisma.user.findUnique({ where: { email } });
    if (!student || student.role !== 'STUDENT') throw notFound('No student account found with that email.');
    await prisma.parentLink.upsert({
      where: { parentId_studentId: { parentId: req.user!.id, studentId: student.id } },
      update: {},
      create: { parentId: req.user!.id, studentId: student.id },
    });
    res.status(201).json({ child: publicUser(student) });
  }),
);

/** Create a new student account for a child and link it. */
familyRouter.post(
  '/children',
  ah(async (req, res) => {
    const name = str(req.body, 'name', { required: true, max: 80 })!;
    const email = str(req.body, 'email', { required: true, max: 120 })!.toLowerCase();
    const password = str(req.body, 'password', { required: true })!;
    const grade = int(req.body.grade ?? 5, 'grade', 5, 7);
    if (password.length < 6) throw badRequest('Password must be at least 6 characters.');
    if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, 'An account with this email already exists.');
    const student = await prisma.user.create({
      data: { name, email, grade, role: 'STUDENT', passwordHash: await bcrypt.hash(password, 10) },
    });
    await createDefaultHabits(student.id);
    await prisma.parentLink.create({ data: { parentId: req.user!.id, studentId: student.id } });
    res.status(201).json({ child: publicUser(student) });
  }),
);

familyRouter.delete(
  '/children/:studentId',
  ah(async (req, res) => {
    await prisma.parentLink.deleteMany({ where: { parentId: req.user!.id, studentId: req.params.studentId } });
    res.status(204).end();
  }),
);
