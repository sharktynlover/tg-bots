import { GrammyError } from 'grammy';
import { logger } from './logger';

/**
 * Runs a Telegram API call that targets another user; swallows the errors that
 * simply mean the recipient is unreachable (blocked the bot, deactivated, ...).
 */
export async function trySend<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof GrammyError && [400, 403].includes(error.error_code)) {
      logger.warn({ event: 'telegram_delivery_failed', reason: error.description }, 'delivery skipped');
      return null;
    }
    throw error;
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function pluralizeYears(age: number): string {
  const mod10 = age % 10;
  const mod100 = age % 100;
  if (mod10 === 1 && mod100 !== 11) return `${age} год`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${age} года`;
  return `${age} лет`;
}
