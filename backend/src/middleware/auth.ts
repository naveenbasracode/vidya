// Authentication (JWT) and role-based access control (TASK-03/04).
import type { NextFunction, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role, User } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { HttpError, ah } from '../lib/http.js';

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
    interface Locals {
      student?: User;
    }
  }
}

export const signToken = (u: AuthUser) => jwt.sign(u, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as SignOptions);

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Please log in.' });
  try {
    const decoded = jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
    req.user = { id: decoded.id, role: decoded.role, name: decoded.name, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
};

export const authorize =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Please log in.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    next();
  };

/** Can `user` see/manage this student's data? Students: themselves. Parents: linked children. Admins: everyone. */
export const canAccessStudent = async (user: AuthUser, studentId: string) => {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'STUDENT') return user.id === studentId;
  const link = await prisma.parentLink.findUnique({ where: { parentId_studentId: { parentId: user.id, studentId } } });
  return !!link;
};

/**
 * Resolves `:studentId` ("me" for the logged-in student) into res.locals.student after checking access.
 */
export const loadStudent = ah(async (req, res, next) => {
  const user = req.user!;
  const param = req.params.studentId;
  const studentId = param === 'me' ? user.id : param;
  if (!(await canAccessStudent(user, studentId))) throw new HttpError(403, 'You do not have access to this student.');
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== 'STUDENT') throw new HttpError(404, 'Student not found.');
  res.locals.student = student;
  next();
});
