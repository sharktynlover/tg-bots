import { inject, singleton } from 'tsyringe';
import { and, asc, desc, eq, gt, inArray, isNotNull, not, notInArray, or, sql } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import {
  blacklist,
  likes,
  userPhotos,
  users,
  type Gender,
  type NewUserRow,
  type SearchPreference,
  type UserPhotoRow,
  type UserRow,
} from '@/entities';

export interface FeedFilter {
  viewerId: number;
  viewerGender: Gender;
  viewerPreference: SearchPreference;
  excludeIds: number[];
}

@singleton()
export class UserRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  async findById(id: number): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async findByReferralCode(code: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.referralCode, code)).limit(1);
    return row ?? null;
  }

  async create(values: NewUserRow): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(values).returning();
    if (!row) throw new Error('Failed to create user');
    return row;
  }

  async update(id: number, values: Partial<NewUserRow>): Promise<UserRow | null> {
    const [row] = await this.db
      .update(users)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async touchActivity(id: number, username: string | null): Promise<void> {
    await this.db
      .update(users)
      .set({ lastActiveAt: new Date(), username })
      .where(eq(users.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async setBanned(id: number, isBanned: boolean): Promise<void> {
    await this.db.update(users).set({ isBanned, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async getPhotos(userId: number): Promise<UserPhotoRow[]> {
    return this.db
      .select()
      .from(userPhotos)
      .where(eq(userPhotos.userId, userId))
      .orderBy(asc(userPhotos.position));
  }

  async replacePhotos(userId: number, photoUrls: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(userPhotos).where(eq(userPhotos.userId, userId));
      if (photoUrls.length > 0) {
        await tx.insert(userPhotos).values(
          photoUrls.map((photoUrl, index) => ({
            userId,
            photoUrl,
            position: index + 1,
          })),
        );
      }
    });
  }

  async addPhoto(userId: number, photoUrl: string): Promise<void> {
    const existing = await this.getPhotos(userId);
    await this.db.insert(userPhotos).values({
      userId,
      photoUrl,
      position: existing.length + 1,
    });
  }

  async deletePhoto(photoId: number, userId: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(userPhotos)
        .where(and(eq(userPhotos.id, photoId), eq(userPhotos.userId, userId)));
      const remaining = await tx
        .select()
        .from(userPhotos)
        .where(eq(userPhotos.userId, userId))
        .orderBy(asc(userPhotos.position));
      await Promise.all(
        remaining.map((photo, index) =>
          tx.update(userPhotos).set({ position: index + 1 }).where(eq(userPhotos.id, photo.id)),
        ),
      );
    });
  }

  /**
   * Next feed candidate: complete, visible, gender-compatible profiles the viewer
   * has neither acted on nor blacklisted. Boosted profiles come first.
   */
  async findFeedCandidate(filter: FeedFilter): Promise<UserRow | null> {
    const now = new Date();
    const genderCondition =
      filter.viewerPreference === 'both'
        ? undefined
        : eq(users.gender, filter.viewerPreference as Gender);

    const conditions = [
      eq(users.isProfileComplete, true),
      eq(users.isHidden, false),
      eq(users.isBanned, false),
      not(eq(users.id, filter.viewerId)),
      isNotNull(users.gender),
      or(
        eq(users.searchPreference, 'both'),
        eq(users.searchPreference, filter.viewerGender as SearchPreference),
      ),
      notInArray(
        users.id,
        this.db
          .select({ id: likes.toUserId })
          .from(likes)
          .where(eq(likes.fromUserId, filter.viewerId)),
      ),
      notInArray(
        users.id,
        this.db
          .select({ id: blacklist.userId })
          .from(blacklist)
          .where(eq(blacklist.blockedById, filter.viewerId)),
      ),
    ];

    if (genderCondition) conditions.push(genderCondition);
    if (filter.excludeIds.length > 0) {
      conditions.push(not(inArray(users.id, filter.excludeIds)));
    }

    const [row] = await this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(gt(users.boostExpiresAt, now)), sql`random()`)
      .limit(1);

    return row ?? null;
  }

  async consumeSuperlike(id: number): Promise<boolean> {
    const [row] = await this.db
      .update(users)
      .set({ superlikesAvailable: sql`${users.superlikesAvailable} - 1`, updatedAt: new Date() })
      .where(and(eq(users.id, id), gt(users.superlikesAvailable, 0)))
      .returning({ id: users.id });
    return Boolean(row);
  }

  async grantSuperlikes(id: number, amount: number): Promise<void> {
    await this.db
      .update(users)
      .set({
        superlikesAvailable: sql`${users.superlikesAvailable} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async setBoostExpiry(id: number, expiresAt: Date | null): Promise<void> {
    await this.db
      .update(users)
      .set({ boostExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async resetWeeklySuperlikes(amount: number, resetAt: Date): Promise<number> {
    const rows = await this.db
      .update(users)
      .set({ superlikesAvailable: amount, superlikesResetAt: resetAt, updatedAt: new Date() })
      .returning({ id: users.id });
    return rows.length;
  }

  async clearExpiredBoosts(now: Date = new Date()): Promise<number> {
    const rows = await this.db
      .update(users)
      .set({ boostExpiresAt: null, updatedAt: now })
      .where(and(isNotNull(users.boostExpiresAt), sql`${users.boostExpiresAt} <= ${now}`))
      .returning({ id: users.id });
    return rows.length;
  }
}
