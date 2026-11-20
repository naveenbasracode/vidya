import 'dotenv/config';
import path from 'node:path';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.warn('⚠️  JWT_SECRET is not set in backend/.env — using an insecure development secret.');
}

export const config = {
  port: Number(process.env.PORT ?? 5050),
  jwtSecret: jwtSecret || 'vidya-dev-secret-change-me',
  jwtExpiresIn: '7d',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
  maxUploadBytes: 25 * 1024 * 1024,
};
