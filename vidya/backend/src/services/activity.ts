import { Request, Response } from 'express';
import { PrismaClient } from '../db';

const prisma = new PrismaClient();

/**
 * Records a student activity (e.g., "Reading", "Practice").
 * Implementation for Task-10 (Activity Tracking Logic).
 */
export const logActivity = async (req: Request, Response) => {
  const { activityName, status }_body = req.body;
  const userId = (req as any).user.userId;

  try {
    const activity = await prisma.activityLog.create({
      data: {
        userId,
        activityName,
        status,
        completedAt: new Date(),
      },
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log activity.' });
  }
};

/**
 * Calculates and updates the achievement status for a student.
 * Implementation for Task-11 (Achievement Status Calculation).
 */
export const updateAchievementStatus = async (userId: string) => {
  // Fetch all academic achievements
  const records = await prisma.achievement.findMany({
    where: { userId },
    include: { type: true },
  });

  // Calculate the average score for ACADEMIC achievements
  const academicScores = records
    .filter(r => r.type === 'ACADEMIC')
    .map(r => r.score);

  const average = academicScores.length > 0
    ? academicScores.reduce((a, b) => a + b, 0) / academicScores.length
    : 0;

  let status = 'RED';
  if (average >= 95) status = 'GREEN';
  else if (average >= 85) status = 'AMBER';

  return {
    average,
    status
  };
};

/**
 * Triggers notifications for critical status.
 * Implementation for Task-12 (Notification Trigger System).
 */
export const checkAlerts = async (userId: string) => {
  const status = await updateAchievementStatus(userId);

  if (status.status === 'RED') {
    // This is where an in-app notification would be triggered
    console.log(`ALERT: User ${userId} has a Red status (Score: ${status.average})`);
    return { alert: 'Performance below 85%.' };
  }
  return null;
};

export default {
  logActivity,
  updateAchievementStatus,
  checkAlerts,
};
