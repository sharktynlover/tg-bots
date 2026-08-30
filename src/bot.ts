import { Bot } from 'grammy';
import { env } from '@/config/env.config';
import type { BotContext } from '@/types/context';

export const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

export const BOT_API_TOKEN = Symbol.for('BotApi');
export type BotApi = typeof bot.api;
