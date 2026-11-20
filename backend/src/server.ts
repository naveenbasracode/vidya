import { config } from './config.js';
import { createApp } from './app.js';
import { prisma } from './db.js';
import { ensureStorageDirectory } from './lib/storage.js';
import { ensureDefaultExams } from './routes/admin.js';

const main = async () => {
  try {
    await prisma.$connect();
  } catch (e) {
    console.error('\n❌ Could not connect to PostgreSQL. Check DATABASE_URL in backend/.env and that PostgreSQL is running.\n');
    console.error((e as Error).message);
    process.exit(1);
  }
  ensureStorageDirectory();
  const created = await ensureDefaultExams();
  if (created) console.log(`Created ${created} default exams.`);

  createApp().listen(config.port, () => {
    console.log(`✅ Vidya API listening on http://localhost:${config.port}`);
  });
};

main();
