import { inject, singleton } from 'tsyringe';
import { count, gt, lte } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import { boosts, type BoostRow, type BoostSource } from '@/entities';

@singleton()
export class BoostRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  async create(userId: number, expiresAt: Date, source: BoostSource): Promise<BoostRow> {
    const [row] = await this.db.insert(boosts).values({ userId, expiresAt, source }).returning();
    if (!row) throw new Error('Failed to create boost');
    return row;
  }

  async countActive(now: Date = new Date()): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(boosts)
      .where(gt(boosts.expiresAt, now));
    return row?.value ?? 0;
  }

  async listExpired(now: Date = new Date()): Promise<BoostRow[]> {
    return this.db.select().from(boosts).where(lte(boosts.expiresAt, now));
  }
}
