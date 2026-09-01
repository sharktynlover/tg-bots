import { singleton } from 'tsyringe';
import type { MiddlewareFn } from 'grammy';
import type { GuardName } from '@/decorators/middleware.decorator';
import type { BotContext } from '@/types/context';
import { MESSAGES } from '@/messages/ru';

@singleton()
export class GuardRegistry {
  private readonly guards: Record<GuardName, MiddlewareFn<BotContext>> = {
    auth: async (ctx, next) => {
      if (!ctx.user) return;
      await next();
    },
    profile: async (ctx, next) => {
      if (!ctx.user?.isProfileComplete) {
        await ctx.reply(MESSAGES.COMMON.NEED_PROFILE);
        return;
      }
      await next();
    },
    admin: async (ctx, next) => {
      if (ctx.role !== 'admin' && ctx.role !== 'developer') {
        await ctx.reply(MESSAGES.ERRORS.FORBIDDEN);
        return;
      }
      await next();
    },
    developer: async (ctx, next) => {
      if (ctx.role !== 'developer') {
        await ctx.reply(MESSAGES.ERRORS.FORBIDDEN);
        return;
      }
      await next();
    },
  };

  get(name: GuardName): MiddlewareFn<BotContext> {
    return this.guards[name];
  }
}
