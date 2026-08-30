import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/entities/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/dating_db',
  },
  strict: true,
  verbose: true,
});
