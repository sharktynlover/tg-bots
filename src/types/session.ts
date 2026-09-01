import type { Gender, SearchPreference } from '@/entities';

export interface ProfileDraft {
  age?: number;
  name?: string;
  description?: string | null;
  photos?: string[];
  groupName?: string;
  gender?: Gender;
  searchPreference?: SearchPreference;
}

export type EditableField = 'age' | 'name' | 'description' | 'photos' | 'groupName' | 'searchPreference';

export type SessionState =
  | { step: 'idle' }
  | { step: 'creating'; field: keyof ProfileDraft; draft: ProfileDraft }
  | { step: 'editing'; field: EditableField; draft: ProfileDraft }
  | { step: 'asking_question'; targetUserId: number }
  | { step: 'answering_question'; questionId: number }
  | { step: 'reporting'; targetUserId: number };

export const IDLE_STATE: SessionState = { step: 'idle' };
