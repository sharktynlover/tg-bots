import { bigint, integer, jsonb, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import type { Lesson, ScheduleFormat, WeekSchedule } from '../types';

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
	groupApiId: varchar('group_api_id', { length: 64 }),
	/** null — напоминания выключены. */
	reminderOffset: integer('reminder_offset').default(5),
	scheduleFormat: varchar('schedule_format', { length: 16 })
		.$type<ScheduleFormat>()
		.notNull()
		.default('detailed'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const scheduleCache = pgTable('schedule_cache', {
	groupApiId: varchar('group_api_id', { length: 64 }).primaryKey(),
	rawDataHash: varchar('raw_data_hash', { length: 64 }).notNull(),
	parsedData: jsonb('parsed_data').$type<WeekSchedule>().notNull(),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
});

export const preScheduleCache = pgTable('pre_schedule_cache', {
	groupApiId: varchar('group_api_id', { length: 64 }).primaryKey(),
	rawDataHash: varchar('raw_data_hash', { length: 64 }).notNull(),
	parsedData: jsonb('parsed_data').$type<WeekSchedule>().notNull(),
	/** Уроки преподавателей, из которых собрано предрасписание. */
	teacherSourceData: jsonb('teacher_source_data').$type<Lesson[]>().notNull(),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ScheduleCacheRow = typeof scheduleCache.$inferSelect;
export type PreScheduleCacheRow = typeof preScheduleCache.$inferSelect;
