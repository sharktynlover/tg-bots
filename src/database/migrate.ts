import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';

const MIGRATIONS_FOLDER = 'src/database/migrations';

export async function runMigrations(): Promise<void> {
  const client = postgres(env.DATABASE_URL, { max: 1, onnotice: () => undefined });
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
    logger.info({ event: 'migrations_applied' }, 'migrations applied');
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  runMigrations().catch((error: unknown) => {
    logger.error({ event: 'migrations_failed', error: String(error) }, 'migrations failed');
    process.exit(1);
  });
}
