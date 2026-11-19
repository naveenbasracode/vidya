import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { ah, badRequest, HttpError, str, int } from '../lib/http.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { createDefaultHabits } from '../services/students.js';
import type { User } from '@prisma/client';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  grade: u.grade,
  onboarded: u.onboarded,
});

const session = (u: User) => ({ token: signToken({ id: u.id, role: u.role, name: u.name, email: u.email }), user: publicUser(u) });

authRouter.post(
  '/register',
  ah(async (req, res) => {
    const name = str(req.body, 'name', { required: true, max: 80 })!;
    const email = str(req.body, 'email', { required: true, max: 120 })!.toLowerCase();
    const password = str(req.body, 'password', { required: true, max: 200 })!;
    const role = req.body.role ?? 'STUDENT';
    if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address.');
    if (password.length < 6) throw badRequest('Password must be at least 6 characters.');
    // Admin accounts are created by the seed script, not by public registration.
    if (role !== 'STUDENT' && role !== 'PARENT') throw badRequest('Role must be STUDENT or PARENT.');
    const grade = role === 'STUDENT' ? int(req.body.grade ?? 5, 'grade', 5, 7) : null;

    if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, 'An account with this email already exists.');

    const user = await prisma.user.create({
      data: { name, email, role, grade, passwordHash: await bcrypt.hash(password, 10), onboarded: role !== 'STUDENT' },
    });
    if (role === 'STUDENT') {
      await createDefaultHabits(user.id);
      // Optionally link to an existing parent account
      const parentEmail = str(req.body, 'parentEmail')?.toLowerCase();
      if (parentEmail) {
        const parent = await prisma.user.findUnique({ where: { email: parentEmail } });
        if (parent?.role === 'PARENT') await prisma.parentLink.create({ data: { parentId: parent.id, studentId: user.id } });
      }
    }
    res.status(201).json(session(user));
  }),
);

authRouter.post(
  '/login',
  ah(async (req, res) => {
    const email = str(req.body, 'email', { required: true })!.toLowerCase();
    const password = str(req.body, 'password', { required: true })!;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Incorrect email or password.');
    }
    res.json(session(user));
  }),
);

authRouter.get(
  '/me',
  authenticate,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(401, 'Account no longer exists.');
    res.json({ user: publicUser(user) });
  }),
);
