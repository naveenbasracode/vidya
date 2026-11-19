import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const forbidden = (msg = 'You do not have permission to do that.') => new HttpError(403, msg);

/** Wrap async route handlers so rejected promises reach the error middleware (Express 4). */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  const e = err as { code?: string; type?: string; message?: string };
  if (e?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  if (e?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large (max 25 MB).' });
  if (e?.code === 'P2002') return res.status(409).json({ error: 'That record already exists.' });
  if (e?.code === 'P2025') return res.status(404).json({ error: 'Record not found.' });
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on the server.' });
};

/** Read a required string field from a body. */
export const str = (body: Record<string, unknown>, key: string, opts: { required?: boolean; max?: number } = {}) => {
  const v = body?.[key];
  if (v === undefined || v === null || v === '') {
    if (opts.required) throw badRequest(`${key} is required.`);
    return undefined;
  }
  if (typeof v !== 'string') throw badRequest(`${key} must be text.`);
  const t = v.trim();
  if (opts.required && !t) throw badRequest(`${key} is required.`);
  if (opts.max && t.length > opts.max) throw badRequest(`${key} is too long (max ${opts.max}).`);
  return t;
};

export const int = (v: unknown, name: string, min: number, max: number) => {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${name} must be a whole number between ${min} and ${max}.`);
  }
  return n;
};
