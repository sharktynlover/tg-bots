import { bigint, index, pgTable, serial, smallint, timestamp } from 'drizzle-orm/pg-core';
import { boostSourceEnum, rewardTypeEnum } from './enums';
import { users } from './user.entity';

export const referrals = pgTable(
  'referrals',
  {
    id: serial('id').primaryKey(),
    referrerId: bigint('referrer_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    referredId: bigint('referred_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    rewardType: rewardTypeEnum('reward_type').notNull(),
    rewardAmount: smallint('reward_amount').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    referrerIdx: index('referrals_referrer_idx').on(table.referrerId),
  }),
);

export const boosts = pgTable(
  'boosts',
  {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    source: boostSourceEnum('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    expiryIdx: index('boosts_expiry_idx').on(table.expiresAt),
  }),
);

export type ReferralRow = typeof referrals.$inferSelect;
export type BoostRow = typeof boosts.$inferSelect;
