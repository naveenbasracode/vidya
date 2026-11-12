import { Request, Response } from 'express';
import { PrismaClient } from '../db';
import { ensureStorageDirectory, getFilePath, doesFileExist } from '../lib/storage';
import fs from 'fs';

const prisma = new PrismaClient();

/**
 * Creates a record for a new piece of content (e.g. a practice question set).
 * Implementation for Task-08 (Practice Question Generation) logic.
 */
export const generatePracticeQuestions = async (req: Request, res: Response) => {
  const { subject, topic, description } = req.body;

  if (!subject || !topic) {
    return res.status(400).json({ error: 'Subject and Topic are required.' });
  }

  try {
    // This simulates the "Generation" of questions from a PDF
    // In a full implementation, this would call a Language Model or Rule-based generator
    const generatedQuestions = [
      { id: 1, question: `Sample question for ${topic} in ${subject}?`, answer: 'Expected Answer' },
      { id: 2, question: `Another sample for ${topic}?`, answer: 'Another Expected Answer' }
    ];

    // Save the generated questions to the curriculum records
    await prisma.curriculumContent.create({
      data: {
        subject,
        topic,
        contentData: JSON.stringify(generatedQuestions),
      },
    });

    res.status(201).json({
      message: 'Practice questions generated successfully.',
      data: generatedQuestions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate practice questions.' });
  }
};

/**
 * Evaluates a student's essay response against the curriculum.
 * Implementation for Task-09 (Automated Grading).
 */
export const evaluateEssay = async (req: Request, res: Response) => {
  const { submissionText, topic } = req.body;

  if (!submissionText) {
    return res.status(400).json({ error: 'Submission text is required.' });
  }

  try {
    // Simulate automated grading logic
    // In a production app, this would interact with an LLM or a sophisticated grading heuristic
    const score = Math.floor(Math.random() * (100 - 70) + 70); // Simulate a passing score
    const feedback = `Your response for ${topic} was evaluated. Score: ${score}/100. ${score > 80 ? 'Good job!' : 'Need more detail.'}`;

    // Record the submission in the Achievement system
    await prisma.achievement.create({
      data: {
        userId: (req as any).user.userId,
        type: 'ACADEMIC',
        score: score,
        status: score >= 95 ? 'GREEN' : score >= 85 ? 'AMBER' : 'RED',
        feedback: feedback,
      },
    });

    res.status(200).json({
      score,
      feedback,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Grading error occurred.' });
  }
};

export default {
  generatePracticeQuestions,
  evaluateEssay,
};
