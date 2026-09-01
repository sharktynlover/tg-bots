import {
  bigint,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { adminRoleEnum } from './enums';

export const adminRoles = pgTable('admin_roles', {
  userId: bigint('user_id', { mode: 'number' }).primaryKey(),
  role: adminRoleEnum('role').notNull(),
  grantedBy: bigint('granted_by', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminLogs = pgTable(
  'admin_logs',
  {
    id: serial('id').primaryKey(),
    adminId: bigint('admin_id', { mode: 'number' }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    targetUserId: bigint('target_user_id', { mode: 'number' }),
    reason: text('reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdIdx: index('admin_logs_created_idx').on(table.createdAt),
  }),
);

export const botSettings = pgTable('bot_settings', {
  key: varchar('key', { length: 50 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const statsSnapshots = pgTable('stats_snapshots', {
  id: serial('id').primaryKey(),
  payload: jsonb('payload').$type<Record<string, number>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AdminRoleRow = typeof adminRoles.$inferSelect;
export type AdminLogRow = typeof adminLogs.$inferSelect;
export type BotSettingRow = typeof botSettings.$inferSelect;
