import { singleton } from 'tsyringe';
import { GrammyError, HttpError, type ErrorHandler } from 'grammy';
import type { BotContext } from '@/types/context';
import { MESSAGES } from '@/messages/ru';
import { AdminService } from '@/services/admin.service';
import { logger } from '@/utils/logger';

@singleton()
export class ErrorHandlerMiddleware {
  constructor(private readonly adminService: AdminService) {}

  handler(): ErrorHandler<BotContext> {
    return async (error) => {
      const { ctx } = error;
      const cause = error.error;
      const context = {
        userId: ctx.from?.id,
        updateType: Object.keys(ctx.update).filter((key) => key !== 'update_id')[0],
      };

      if (cause instanceof GrammyError) {
        logger.error({ event: 'telegram_api_error', ...context, description: cause.description });
      } else if (cause instanceof HttpError) {
        logger.error({ event: 'telegram_network_error', ...context, error: String(cause) });
      } else {
        logger.error({ event: 'unhandled_error', ...context, error: String(cause) });
      }

      await this.adminService.recordError(cause, context).catch(() => undefined);
      await ctx.reply(MESSAGES.COMMON.ERROR).catch(() => undefined);
    };
  }
}
