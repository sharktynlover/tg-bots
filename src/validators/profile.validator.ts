import { z } from 'zod';

export function ageValidator(min: number, max: number) {
  return z.coerce.number().int().min(min).max(max);
}

export const nameValidator = z.string().trim().min(1).max(100);

export function descriptionValidator(max: number) {
  return z.string().trim().max(max);
}

export const groupValidator = z.string().trim().min(1).max(100);
