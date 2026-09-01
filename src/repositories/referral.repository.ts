import { inject, singleton } from 'tsyringe';
import { and, count, eq } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import { referrals, type ReferralRow, type RewardType } from '@/entities';

export interface ReferralStats {
  total: number;
  superlikes: number;
  boosts: number;
}

@singleton()
export class ReferralRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  async create(
    referrerId: number,
    referredId: number,
    rewardType: RewardType,
    rewardAmount: number,
  ): Promise<ReferralRow | null> {
    const [row] = await this.db
      .insert(referrals)
      .values({ referrerId, referredId, rewardType, rewardAmount })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  async countForReferrer(referrerId: number): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, referrerId));
    return row?.value ?? 0;
  }

  async statsForReferrer(referrerId: number): Promise<ReferralStats> {
    const [total] = await this.db
      .select({ value: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, referrerId));
    const [superlikes] = await this.db
      .select({ value: count() })
      .from(referrals)
      .where(and(eq(referrals.referrerId, referrerId), eq(referrals.rewardType, 'superlike')));
    const [boosts] = await this.db
      .select({ value: count() })
      .from(referrals)
      .where(and(eq(referrals.referrerId, referrerId), eq(referrals.rewardType, 'boost')));

    return {
      total: total?.value ?? 0,
      superlikes: superlikes?.value ?? 0,
      boosts: boosts?.value ?? 0,
    };
  }

  async exists(referredId: number): Promise<boolean> {
    const [row] = await this.db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.referredId, referredId))
      .limit(1);
    return Boolean(row);
  }

  async total(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(referrals);
    return row?.value ?? 0;
  }
}
