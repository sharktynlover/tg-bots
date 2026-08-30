import { inject, singleton } from 'tsyringe';
import { and, count, eq, or } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import { matches, type MatchRow } from '@/entities';

@singleton()
export class MatchRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  private static order(a: number, b: number): [number, number] {
    return a <= b ? [a, b] : [b, a];
  }

  async create(userA: number, userB: number): Promise<MatchRow | null> {
    const [userAId, userBId] = MatchRepository.order(userA, userB);
    const [row] = await this.db
      .insert(matches)
      .values({ userAId, userBId })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  async exists(userA: number, userB: number): Promise<boolean> {
    const [userAId, userBId] = MatchRepository.order(userA, userB);
    const [row] = await this.db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.userAId, userAId), eq(matches.userBId, userBId)))
      .limit(1);
    return Boolean(row);
  }

  async listForUser(userId: number): Promise<MatchRow[]> {
    return this.db
      .select()
      .from(matches)
      .where(or(eq(matches.userAId, userId), eq(matches.userBId, userId)));
  }

  async total(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(matches);
    return row?.value ?? 0;
  }
}
