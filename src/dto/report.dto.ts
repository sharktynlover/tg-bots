import { z } from 'zod';

export const CreateReportSchema = z.object({
  reportedUserId: z.number().int().positive(),
  reason: z.string().min(1).max(1000),
});

export type CreateReportDTO = z.infer<typeof CreateReportSchema>;
