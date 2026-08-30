import 'reflect-metadata';
import cron from 'node-cron';
import { sql } from '@/config/database.config';
import { redis } from '@/config/redis.config';
import { configureContainer } from '@/core/container';
import { CronJobs } from '@/cron/jobs';
import { logger } from '@/utils/logger';

const SCHEDULES = {
  /** Monday at 00:00 */
  weeklySuperlikes: '0 0 * * 1',
  everyFiveMinutes: '*/5 * * * *',
  hourly: '0 * * * *',
} as const;

function runSafely(name: string, job: () => Promise<void>): () => void {
  return () => {
    void job().catch((error: unknown) => {
      logger.error({ event: 'cron_failed', job: name, error: String(error) }, 'cron job failed');
    });
  };
}

function bootstrap(): void {
  const jobs = configureContainer().resolve(CronJobs);

  cron.schedule(SCHEDULES.weeklySuperlikes, runSafely('reset_superlikes', () => jobs.resetSuperlikes()));
  cron.schedule(SCHEDULES.everyFiveMinutes, runSafely('expire_boosts', () => jobs.expireBoosts()));
  cron.schedule(SCHEDULES.hourly, runSafely('stats_snapshot', () => jobs.snapshotStats()));

  logger.info({ event: 'cron_started', jobs: Object.keys(SCHEDULES) }, 'cron service started');

  const shutdown = async (): Promise<void> => {
    await sql.end({ timeout: 5 }).catch(() => undefined);
    redis.disconnect();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

bootstrap();
