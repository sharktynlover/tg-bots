import {
  bigint,
  boolean,
  index,
  pgTable,
  serial,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { likeTypeEnum } from './enums';
import { users } from './user.entity';

export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    fromUserId: bigint('from_user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toUserId: bigint('to_user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: likeTypeEnum('type').notNull().default('like'),
    isSeen: boolean('is_seen').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairUnique: unique('likes_pair_unique').on(table.fromUserId, table.toUserId),
    incomingIdx: index('likes_incoming_idx').on(table.toUserId, table.isSeen),
  }),
);

export const matches = pgTable(
  'matches',
  {
    id: serial('id').primaryKey(),
    userAId: bigint('user_a_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userBId: bigint('user_b_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairUnique: unique('matches_pair_unique').on(table.userAId, table.userBId),
  }),
);

export type LikeRow = typeof likes.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
