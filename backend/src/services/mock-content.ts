import { Request, Response } from 'express';
import { PrismaClient } from '../db';
import { Response } from 'express';

const prisma = new PrismaClient();

/**
 * Mocked version of the content service for testing purposes
 * This avoids needing a live database connection during unit tests.
 */
export const mockGeneratePracticeQuestions = async (req: Request, res: Response) => {
  const { subject, topic } = req.body;

  if (!subject || !topic) {
    return res.status(400).json({ error: 'Subject and Topic are required.' });
  }

  // Simulate successful record creation
  const mockData = [
    { id: 1, question: `Sample question for ${topic}`, answer: 'Expected Answer' }
  ];

  res.status(201).json({
    message: 'Practice questions generated successfully.',
    data: mockData,
  });
};

export const mockEvaluateEssay = async (req: Request, res: Response) => {
  const { submissionText, topic } = req.body;

  if (!submissionText) {
    return res.status(400).json({ error: 'Submission text is required.' });
  }

  // Simulate grading
  res.status(200).json({
    score: 90,
    feedback: 'Good job!',
  });
};

export default {
  generatePracticeQuestions: mockGeneratePracticeQuestions,
  evaluateEssay: mockEvaluateEssay,
};
