import { inject, singleton } from 'tsyringe';
import { and, count, eq, gt, gte } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import { likes, matches, questions, referrals, reports, users } from '@/entities';
import { daysAgo } from '@/utils/date.utils';

export interface BotStats {
  users: number;
  completeProfiles: number;
  activeUsers: number;
  bannedUsers: number;
  hiddenProfiles: number;
  likes: number;
  superlikes: number;
  matches: number;
  referrals: number;
  activeBoosts: number;
  questions: number;
  pendingReports: number;
}

@singleton()
export class StatsRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  async collect(): Promise<BotStats> {
    const now = new Date();
    const [
      totalUsers,
      completeProfiles,
      activeUsers,
      bannedUsers,
      hiddenProfiles,
      plainLikes,
      superlikes,
      totalMatches,
      totalReferrals,
      activeBoosts,
      totalQuestions,
      pendingReports,
    ] = await Promise.all([
      this.db.select({ value: count() }).from(users),
      this.db.select({ value: count() }).from(users).where(eq(users.isProfileComplete, true)),
      this.db.select({ value: count() }).from(users).where(gte(users.lastActiveAt, daysAgo(7, now))),
      this.db.select({ value: count() }).from(users).where(eq(users.isBanned, true)),
      this.db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.isHidden, true), eq(users.isProfileComplete, true))),
      this.db.select({ value: count() }).from(likes).where(eq(likes.type, 'like')),
      this.db.select({ value: count() }).from(likes).where(eq(likes.type, 'superlike')),
      this.db.select({ value: count() }).from(matches),
      this.db.select({ value: count() }).from(referrals),
      this.db.select({ value: count() }).from(users).where(gt(users.boostExpiresAt, now)),
      this.db.select({ value: count() }).from(questions),
      this.db.select({ value: count() }).from(reports).where(eq(reports.status, 'pending')),
    ]);

    const value = (rows: { value: number }[]): number => rows[0]?.value ?? 0;

    return {
      users: value(totalUsers),
      completeProfiles: value(completeProfiles),
      activeUsers: value(activeUsers),
      bannedUsers: value(bannedUsers),
      hiddenProfiles: value(hiddenProfiles),
      likes: value(plainLikes),
      superlikes: value(superlikes),
      matches: value(totalMatches),
      referrals: value(totalReferrals),
      activeBoosts: value(activeBoosts),
      questions: value(totalQuestions),
      pendingReports: value(pendingReports),
    };
  }
}
