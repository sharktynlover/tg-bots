import { inject, singleton } from 'tsyringe';
import { and, count, desc, eq } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import { blacklist, reports, type ReportRow } from '@/entities';

@singleton()
export class ReportRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  async create(reporterId: number, reportedUserId: number, reason: string): Promise<ReportRow> {
    const [row] = await this.db
      .insert(reports)
      .values({ reporterId, reportedUserId, reason })
      .returning();
    if (!row) throw new Error('Failed to create report');
    return row;
  }

  async findById(id: number): Promise<ReportRow | null> {
    const [row] = await this.db.select().from(reports).where(eq(reports.id, id)).limit(1);
    return row ?? null;
  }

  async listPending(limit = 20): Promise<ReportRow[]> {
    return this.db
      .select()
      .from(reports)
      .where(eq(reports.status, 'pending'))
      .orderBy(desc(reports.createdAt))
      .limit(limit);
  }

  async resolve(id: number, adminId: number): Promise<ReportRow | null> {
    const [row] = await this.db
      .update(reports)
      .set({ status: 'resolved', resolvedBy: adminId, resolvedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return row ?? null;
  }

  async softDelete(id: number, adminId: number): Promise<ReportRow | null> {
    const [row] = await this.db
      .update(reports)
      .set({ status: 'deleted', resolvedBy: adminId, resolvedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return row ?? null;
  }

  async countPending(): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(reports)
      .where(eq(reports.status, 'pending'));
    return row?.value ?? 0;
  }

  async hasReported(reporterId: number, reportedUserId: number): Promise<boolean> {
    const [row] = await this.db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.reporterId, reporterId), eq(reports.reportedUserId, reportedUserId)))
      .limit(1);
    return Boolean(row);
  }

  async blacklistAdd(userId: number, blockedById: number): Promise<void> {
    await this.db.insert(blacklist).values({ userId, blockedById }).onConflictDoNothing();
  }

  async isBlacklisted(userId: number, blockedById: number): Promise<boolean> {
    const [row] = await this.db
      .select({ id: blacklist.id })
      .from(blacklist)
      .where(and(eq(blacklist.userId, userId), eq(blacklist.blockedById, blockedById)))
      .limit(1);
    return Boolean(row);
  }
}
