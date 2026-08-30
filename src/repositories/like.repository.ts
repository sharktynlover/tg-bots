import { inject, singleton } from 'tsyringe';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import { likes, users, type LikeRow, type LikeType, type UserRow } from '@/entities';

export interface IncomingLike {
  like: LikeRow;
  sender: UserRow;
}

@singleton()
export class LikeRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  async upsert(fromUserId: number, toUserId: number, type: LikeType): Promise<LikeRow> {
    const [row] = await this.db
      .insert(likes)
      .values({ fromUserId, toUserId, type })
      .onConflictDoUpdate({
        target: [likes.fromUserId, likes.toUserId],
        set: { type, isSeen: false, createdAt: new Date() },
      })
      .returning();
    if (!row) throw new Error('Failed to store like');
    return row;
  }

  async find(fromUserId: number, toUserId: number): Promise<LikeRow | null> {
    const [row] = await this.db
      .select()
      .from(likes)
      .where(and(eq(likes.fromUserId, fromUserId), eq(likes.toUserId, toUserId)))
      .limit(1);
    return row ?? null;
  }

  async countUnseen(toUserId: number): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(likes)
      .where(and(eq(likes.toUserId, toUserId), eq(likes.isSeen, false)));
    return row?.value ?? 0;
  }

  /** Incoming likes queue: superlikes first, then oldest first. */
  async listIncoming(toUserId: number, limit = 50): Promise<IncomingLike[]> {
    const rows = await this.db
      .select({ like: likes, sender: users })
      .from(likes)
      .innerJoin(users, eq(users.id, likes.fromUserId))
      .where(and(eq(likes.toUserId, toUserId), eq(likes.isSeen, false), eq(users.isBanned, false)))
      .orderBy(desc(sql`${likes.type} = 'superlike'`), asc(likes.createdAt))
      .limit(limit);
    return rows;
  }

  async nextIncoming(toUserId: number): Promise<IncomingLike | null> {
    const [row] = await this.listIncoming(toUserId, 1);
    return row ?? null;
  }

  async markSeen(fromUserId: number, toUserId: number): Promise<void> {
    await this.db
      .update(likes)
      .set({ isSeen: true })
      .where(and(eq(likes.fromUserId, fromUserId), eq(likes.toUserId, toUserId)));
  }

  async markAllSeen(toUserId: number): Promise<void> {
    await this.db.update(likes).set({ isSeen: true }).where(eq(likes.toUserId, toUserId));
  }

  async countByType(type: LikeType): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(likes).where(eq(likes.type, type));
    return row?.value ?? 0;
  }
}
