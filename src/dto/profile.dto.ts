import { z } from 'zod';
import { env } from '@/config/env.config';

export const CreateProfileSchema = z.object({
  age: z.number().int().min(env.MIN_AGE).max(env.MAX_AGE),
  name: z.string().min(1).max(100),
  description: z.string().max(env.MAX_DESCRIPTION_LENGTH).nullable().optional(),
  photos: z.array(z.string()).min(1).max(env.MAX_PHOTOS),
  groupName: z.string().min(1).max(100),
  gender: z.enum(['male', 'female']),
  searchPreference: z.enum(['male', 'female', 'both']),
});

export type CreateProfileDTO = z.infer<typeof CreateProfileSchema>;

export const UpdateProfileSchema = CreateProfileSchema.partial().omit({ gender: true });
export type UpdateProfileDTO = z.infer<typeof UpdateProfileSchema>;
