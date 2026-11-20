// Seeds: admin account, the 12 default exams (4 per grade), and a demo family to explore the app.
//   npx prisma db seed
import bcrypt from 'bcryptjs';
import { prisma } from '../src/db.js';
import { ensureDefaultExams } from '../src/routes/admin.js';
import { createDefaultHabits, syncActivityHabits, regenerateWeek } from '../src/services/students.js';
import { startOfWeek, todayLocal } from '../src/lib/dates.js';

const upsertUser = async (email: string, name: string, role: 'ADMIN' | 'PARENT' | 'STUDENT', password: string, grade?: number) =>
  prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, grade: grade ?? null, onboarded: true, passwordHash: await bcrypt.hash(password, 10) },
  });

const main = async () => {
  const created = await ensureDefaultExams();
  console.log(`Exams: ${created} created.`);

  await upsertUser('admin@vidya.local', 'Vidya Admin', 'ADMIN', 'admin123');

  const parent = await upsertUser('parent@vidya.local', 'Demo Parent', 'PARENT', 'parent123');
  const student = await upsertUser('student@vidya.local', 'Aarav', 'STUDENT', 'student123', 5);
  await prisma.parentLink.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    update: {},
    create: { parentId: parent.id, studentId: student.id },
  });

  if ((await prisma.commitment.count({ where: { studentId: student.id } })) === 0) {
    const school = [1, 2, 3, 4, 5].map((d) => ({ studentId: student.id, kind: 'SCHOOL' as const, name: 'School', dayOfWeek: d, startTime: '08:30', endTime: '15:30' }));
    await prisma.commitment.createMany({
      data: [
        ...school,
        { studentId: student.id, kind: 'ACTIVITY', name: 'Karate', dayOfWeek: 1, startTime: '16:30', endTime: '17:30', practiceMinutes: 15 },
        { studentId: student.id, kind: 'ACTIVITY', name: 'Drums', dayOfWeek: 3, startTime: '18:00', endTime: '19:00', practiceMinutes: 15 },
        { studentId: student.id, kind: 'ACTIVITY', name: 'Football', dayOfWeek: 6, startTime: '09:00', endTime: '10:30' },
      ],
    });
  }
  await createDefaultHabits(student.id);
  await syncActivityHabits(student.id);
  const today = todayLocal();
  if ((await prisma.studyBlock.count({ where: { studentId: student.id } })) === 0) {
    await regenerateWeek(student.id, startOfWeek(today), today);
  }

  console.log(`
Seed complete. Demo logins:
  Student: student@vidya.local / student123
  Parent:  parent@vidya.local  / parent123
  Admin:   admin@vidya.local   / admin123
`);
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
