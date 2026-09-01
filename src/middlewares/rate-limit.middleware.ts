import { inject, singleton } from 'tsyringe';
import type { NextFunction } from 'grammy';
import { REDIS_TOKEN, type RedisClient } from '@/config/redis.config';
import type { BotContext } from '@/types/context';
import { MESSAGES } from '@/messages/ru';

const WINDOW_SECONDS = 3;
const MAX_UPDATES_PER_WINDOW = 12;

@singleton()
export class RateLimitMiddleware {
  constructor(@inject(REDIS_TOKEN) private readonly redis: RedisClient) {}

  handler() {
    return async (ctx: BotContext, next: NextFunction): Promise<void> => {
      const userId = ctx.from?.id;
      if (!userId) return next();

      const key = `ratelimit:${userId}`;
      const hits = await this.redis.incr(key);
      if (hits === 1) await this.redis.expire(key, WINDOW_SECONDS);
      if (hits > MAX_UPDATES_PER_WINDOW) {
        if (hits === MAX_UPDATES_PER_WINDOW + 1) await ctx.reply(MESSAGES.COMMON.RATE_LIMITED);
        return;
      }

      await next();
    };
  }
}
