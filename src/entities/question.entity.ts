import { bigint, boolean, index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { questionStatusEnum } from './enums';
import { users } from './user.entity';

export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    fromUserId: bigint('from_user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toUserId: bigint('to_user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionText: text('question_text').notNull(),
    answerText: text('answer_text'),
    status: questionStatusEnum('status').notNull().default('pending'),
    isAnonymous: boolean('is_anonymous').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
  },
  (table) => ({
    recipientIdx: index('questions_recipient_idx').on(table.toUserId, table.status),
  }),
);

export type QuestionRow = typeof questions.$inferSelect;
