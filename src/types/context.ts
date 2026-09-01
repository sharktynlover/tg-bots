import type { Context } from 'grammy';
import type { AdminRole, UserRow } from '@/entities';
import type { SessionState } from './session';

export interface BotContextFlavor {
  /** Current bot user row; null before the first /start. */
  user: UserRow | null;
  /** Role of the current user, null for regular users. */
  role: AdminRole | null;
  session: SessionState;
  setSession(state: SessionState): Promise<void>;
}

export type BotContext = Context & BotContextFlavor;
