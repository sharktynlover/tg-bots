import type { Bot, FilterQuery, MiddlewareFn } from 'grammy';
import { container } from 'tsyringe';
import { getHandlers, type HandlerMetadata } from '@/decorators/metadata';
import type { GuardName } from '@/decorators/middleware.decorator';
import { GuardRegistry } from '@/middlewares/admin-guard.middleware';
import type { BotContext } from '@/types/context';
import { logger } from '@/utils/logger';

type Handler = (ctx: BotContext) => Promise<void>;
type ControllerClass = new (...args: never[]) => object;

function resolveGuards(guards: string[]): MiddlewareFn<BotContext>[] {
  const registry = container.resolve(GuardRegistry);
  return guards.map((guard) => registry.get(guard as GuardName));
}

function bind(instance: object, handler: HandlerMetadata): Handler {
  const method = (instance as Record<string, unknown>)[handler.method];
  if (typeof method !== 'function') {
    throw new Error(`Handler ${handler.method} is not a method of ${instance.constructor.name}`);
  }
  return (method as Handler).bind(instance);
}

export function registerControllers(bot: Bot<BotContext>, controllers: ControllerClass[]): void {
  for (const Controller of controllers) {
    const instance = container.resolve(Controller as never) as object;
    for (const handler of getHandlers(Controller)) {
      const middlewares = [...resolveGuards(handler.guards), bind(instance, handler)];

      switch (handler.kind) {
        case 'command':
          bot.command(handler.trigger as string, ...middlewares);
          break;
        case 'callback':
          bot.callbackQuery(handler.trigger, ...middlewares);
          break;
        case 'hears':
          bot.hears(handler.trigger, ...middlewares);
          break;
        case 'on':
          bot.on(handler.trigger as FilterQuery, ...middlewares);
          break;
      }

      logger.debug(
        {
          event: 'handler_registered',
          controller: Controller.name,
          kind: handler.kind,
          trigger: String(handler.trigger),
        },
        'handler registered',
      );
    }
  }
}
