import { Bot } from 'grammy';
import type { ApiClientOptions } from 'grammy';
import { env } from '@/config/env.config';
import type { BotContext } from '@/types/context';

/** Bun's fetch accepts a proxy URL, which grammY forwards from baseFetchConfig. */
const client: ApiClientOptions = {
  ...(env.TELEGRAM_API_ROOT ? { apiRoot: env.TELEGRAM_API_ROOT } : {}),
  ...(env.TELEGRAM_PROXY_URL
    ? { baseFetchConfig: { proxy: env.TELEGRAM_PROXY_URL } as RequestInit }
    : {}),
};

export const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN, { client });

export const BOT_API_TOKEN = Symbol.for('BotApi');
export type BotApi = typeof bot.api;
