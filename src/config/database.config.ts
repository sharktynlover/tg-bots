import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/config/env.config';
import * as schema from '@/entities';

export const sql = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_SIZE,
  onnotice: () => undefined,
});

export const db = drizzle(sql, { schema });

export type Database = typeof db;

export const DATABASE_TOKEN = Symbol.for('Database');
