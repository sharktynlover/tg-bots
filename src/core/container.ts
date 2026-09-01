import 'reflect-metadata';
import { container } from 'tsyringe';
import { bot, BOT_API_TOKEN } from '@/bot';
import { db, DATABASE_TOKEN } from '@/config/database.config';
import { redis, REDIS_TOKEN } from '@/config/redis.config';

let configured = false;

/** Registers the infrastructure singletons every service resolves through. */
export function configureContainer(): typeof container {
  if (!configured) {
    container.register(DATABASE_TOKEN, { useValue: db });
    container.register(REDIS_TOKEN, { useValue: redis });
    container.register(BOT_API_TOKEN, { useValue: bot.api });
    configured = true;
  }
  return container;
}
