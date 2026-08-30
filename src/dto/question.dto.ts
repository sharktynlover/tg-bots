import { z } from 'zod';

export const AskQuestionSchema = z.object({
  toUserId: z.number().int().positive(),
  questionText: z.string().min(1).max(500),
});

export type AskQuestionDTO = z.infer<typeof AskQuestionSchema>;

export const AnswerQuestionSchema = z.object({
  questionId: z.number().int().positive(),
  answerText: z.string().min(1).max(500),
});

export type AnswerQuestionDTO = z.infer<typeof AnswerQuestionSchema>;
