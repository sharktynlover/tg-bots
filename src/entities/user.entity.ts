import {
  bigint,
  boolean,
  index,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { genderEnum, searchPreferenceEnum } from './enums';

export const users = pgTable(
  'users',
  {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    username: varchar('username', { length: 255 }),
    age: smallint('age'),
    name: varchar('name', { length: 100 }),
    description: text('description'),
    groupName: varchar('group_name', { length: 100 }),
    gender: genderEnum('gender'),
    searchPreference: searchPreferenceEnum('search_preference'),
    isProfileComplete: boolean('is_profile_complete').notNull().default(false),
    isHidden: boolean('is_hidden').notNull().default(false),
    isBanned: boolean('is_banned').notNull().default(false),
    superlikesAvailable: smallint('superlikes_available').notNull().default(1),
    superlikesResetAt: timestamp('superlikes_reset_at', { withTimezone: true }),
    boostExpiresAt: timestamp('boost_expires_at', { withTimezone: true }),
    referralCode: varchar('referral_code', { length: 20 }).notNull().unique(),
    referredBy: bigint('referred_by', { mode: 'number' }),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    feedIdx: index('users_feed_idx').on(table.isHidden, table.isBanned, table.gender),
    boostIdx: index('users_boost_idx').on(table.boostExpiresAt),
  }),
);

export const userPhotos = pgTable(
  'user_photos',
  {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    photoUrl: text('photo_url').notNull(),
    position: smallint('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('user_photos_user_idx').on(table.userId, table.position),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type UserPhotoRow = typeof userPhotos.$inferSelect;
