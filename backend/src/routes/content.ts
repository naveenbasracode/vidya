import { Request, Response } from 'express';
import * as mockContent from '../services/mock-content';

/**
 * Handles requests for practice question generation.
 */
export const generatePracticeQuestions = async (req: Request, res: Response) => {
  await mockContent.generatePracticeQuestions(req, res);
};

/**
 * Handles requests for automated essay grading.
 */
export const evaluateEssay = async (req: Request, res: Response) => {
  await mockContent.evaluateEssay(req, res);
};

export default {
  generatePracticeQuestions,
  evaluateEssay,
};
