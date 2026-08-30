import 'reflect-metadata';
import { webhookCallback } from 'grammy';
import { bot } from '@/bot';
import { env, isWebhookMode } from '@/config/env.config';
import { redis } from '@/config/redis.config';
import { sql } from '@/config/database.config';
import { CONTROLLERS } from '@/controllers';
import { configureContainer } from '@/core/container';
import { registerControllers } from '@/core/router';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { ErrorHandlerMiddleware } from '@/middlewares/error-handler.middleware';
import { RateLimitMiddleware } from '@/middlewares/rate-limit.middleware';
import { UserService } from '@/services/user.service';
import { logger } from '@/utils/logger';

const BOT_COMMANDS = [
  { command: 'start', description: 'Начать' },
  { command: 'profile', description: 'Моя анкета' },
  { command: 'feed', description: 'Смотреть анкеты' },
  { command: 'likes', description: 'Кто меня лайкнул' },
  { command: 'invite', description: 'Пригласить друга' },
  { command: 'boost', description: 'Поднять анкету' },
  { command: 'help', description: 'Помощь' },
];

async function bootstrap(): Promise<void> {
  const di = configureContainer();

  bot.use(di.resolve(RateLimitMiddleware).handler());
  bot.use(di.resolve(AuthMiddleware).handler());
  registerControllers(bot, [...CONTROLLERS]);
  bot.catch(di.resolve(ErrorHandlerMiddleware).handler());

  await di.resolve(UserService).syncConfiguredRoles();
  await bot.api.setMyCommands(BOT_COMMANDS);

  if (isWebhookMode) {
    await startWebhook();
  } else {
    await bot.api.deleteWebhook({ drop_pending_updates: false });
    void bot.start({ onStart: () => logger.info({ event: 'bot_started', mode: 'polling' }, 'bot started') });
  }

  registerShutdownHooks();
}

async function startWebhook(): Promise<void> {
  await bot.api.setWebhook(`${env.TELEGRAM_WEBHOOK_URL}/webhook`, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    drop_pending_updates: false,
  });

  const handleUpdate = webhookCallback(bot, 'std/http', {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
  });

  Bun.serve({
    port: env.PORT,
    fetch: async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === '/health') return new Response('ok');
      if (pathname === '/webhook' && request.method === 'POST') return handleUpdate(request);
      return new Response('not found', { status: 404 });
    },
  });

  logger.info({ event: 'bot_started', mode: 'webhook', port: env.PORT }, 'bot started');
}

function registerShutdownHooks(): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ event: 'shutdown', signal }, 'shutting down');
    await bot.stop().catch(() => undefined);
    await sql.end({ timeout: 5 }).catch(() => undefined);
    redis.disconnect();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  logger.error({ event: 'bootstrap_failed', error: String(error) }, 'bootstrap failed');
  process.exit(1);
});
