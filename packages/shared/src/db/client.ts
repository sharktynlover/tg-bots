import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

let connection: postgres.Sql | null = null;

export function getConnection(): postgres.Sql {
	if (!connection) connection = postgres(env.databaseUrl, { max: 10 });
	return connection;
}

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
	if (!database) database = drizzle(getConnection(), { schema });
	return database;
}

export async function closeDb(): Promise<void> {
	await connection?.end({ timeout: 5 });
	connection = null;
	database = null;
}

export { schema };
