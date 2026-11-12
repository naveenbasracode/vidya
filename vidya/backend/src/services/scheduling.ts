import { PrismaClient } from '../db';

const prisma = new PrismaClient();

/**
 * Generates a study schedule based on co-curricular constraints and academic performance.
 *
 * @param userId - The ID of the student.
 * @param date - The date to generate the schedule for.
 * @returns {Promise<any[]>} The list of generated study blocks.
 */
export const generatePrioritizedSchedule = async (userId: string, date: Date) => {
  // 1. Fetch all co-curricular activities for this date
  const activities = await prisma.schedule.findMany({
    where: {
      activityType: 'activity',
      startTime: {
        gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
      },
    },
  });

  // 2. Fetch performance records to determine priority
  const performance = await prisma.achievement.findMany({
    where: { userId },
    include: { type: true },
  });

  // 3. Calculate subject priorities (lowest score = highest priority)
  // We'll group by subject name/type
  const subjectPriorities: Record<string, number> = {};
  performance.forEach(record => {
    // For now, we treat the 'type' or a custom property as the subject
    // In a full implementation, we would map achievements to specific subjects
    const score = record.score ?? 0;
    // Store the lowest score found for each subject
    if (!subjectPriorities[record.type] || score < subjectPriorities[record.type]) {
       subjectPriorities[record.type] = score;
    }
  });

  // 4. Identify available time blocks (Simple implementation: 9am - 5pm)
  const availableSlots = [
    { start: 9, end: 10 },
    { start: 11, end: 12 },
    { start: 13, end: 14 },
    { start: 15, end: 16 },
    { start: 16, end: 17 },
  ];

  // Filter out slots that overlap with activities
  const freeSlots = availableSlots.filter(slot => {
    return !activities.some(act => {
      const actHour = new Date(act.startTime).getHours();
      return act.startTime.getHours() >= slot.start && act.startTime.getHours() < slot.end;
    });
  });

  // 5. Assign prioritized subjects to free slots
  const finalSchedule = [];
  const sortedSubjects = Object.keys(subjectPriorities).sort((a, b) => {
    return (subjectPriorities[a] || 100) - (subjectPriorities[b] || 100);
  });

  freeSlots.forEach((slot, index) => {
    if (sortedSubjects[index]) {
      finalSchedule.push({
        subject: sortedSubjects[index],
        startTime: new Date(new Date(date).setHours(slot.start, 0, 0, 0)),
        endTime: new Date(new Date(date).setHours(slot.end, 0, 0, 0)),
        activityType: 'study'
      });
    }
  });

  return finalSchedule;
};
