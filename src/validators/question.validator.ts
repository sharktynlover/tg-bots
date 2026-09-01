import { z } from 'zod';

export const questionTextValidator = z.string().trim().min(1).max(500);
export const answerTextValidator = z.string().trim().min(1).max(500);
export const reportReasonValidator = z.string().trim().min(1).max(1000);
