import { singleton } from 'tsyringe';
import type { NextFunction } from 'grammy';
import type { BotContext } from '@/types/context';
import { MESSAGES } from '@/messages/ru';
import { SessionService } from '@/services/session.service';
import { UserService } from '@/services/user.service';

@singleton()
export class AuthMiddleware {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  handler() {
    return async (ctx: BotContext, next: NextFunction): Promise<void> => {
      const from = ctx.from;
      if (!from || from.is_bot) return;

      const user = await this.userService.findOrCreate(from.id, from.username ?? null);
      ctx.user = user;
      ctx.role = await this.userService.resolveRole(from.id);
      ctx.session = await this.sessionService.get(from.id);
      ctx.setSession = async (state) => {
        ctx.session = state;
        await this.sessionService.set(from.id, state);
      };

      if (user.isBanned) {
        await ctx.reply(MESSAGES.COMMON.BANNED);
        return;
      }

      await next();
    };
  }
}
