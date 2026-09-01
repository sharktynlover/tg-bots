import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { closeDb, getDb } from './client';
import { createLogger, toErrorMeta } from '../utils/logger';

const log = createLogger('migrate');

try {
	await migrate(getDb(), { migrationsFolder: './drizzle' });
	log.info('Миграции применены');
} catch (error) {
	log.error('Миграции не применены', toErrorMeta(error));
	process.exitCode = 1;
} finally {
	await closeDb();
}
