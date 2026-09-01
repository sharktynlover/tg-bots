import { bigint, index, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { reportStatusEnum } from './enums';
import { users } from './user.entity';

export const reports = pgTable(
  'reports',
  {
    id: serial('id').primaryKey(),
    reporterId: bigint('reporter_id', { mode: 'number' }).notNull(),
    reportedUserId: bigint('reported_user_id', { mode: 'number' }).notNull(),
    reason: text('reason').notNull(),
    status: reportStatusEnum('status').notNull().default('pending'),
    resolvedBy: bigint('resolved_by', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index('reports_status_idx').on(table.status, table.createdAt),
  }),
);

export const blacklist = pgTable(
  'blacklist',
  {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedById: bigint('blocked_by_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairUnique: unique('blacklist_pair_unique').on(table.userId, table.blockedById),
  }),
);

export type ReportRow = typeof reports.$inferSelect;
export type BlacklistRow = typeof blacklist.$inferSelect;
