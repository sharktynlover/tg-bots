import { inject, singleton } from 'tsyringe';
import { desc, eq, lt } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import {
  adminLogs,
  adminRoles,
  botSettings,
  statsSnapshots,
  type AdminLogRow,
  type AdminRole,
  type AdminRoleRow,
  type BotSettingRow,
} from '@/entities';

@singleton()
export class AdminRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  async findRole(userId: number): Promise<AdminRoleRow | null> {
    const [row] = await this.db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async grantRole(userId: number, role: AdminRole, grantedBy: number | null): Promise<void> {
    await this.db
      .insert(adminRoles)
      .values({ userId, role, grantedBy })
      .onConflictDoUpdate({ target: adminRoles.userId, set: { role, grantedBy } });
  }

  async revokeRole(userId: number): Promise<boolean> {
    const rows = await this.db
      .delete(adminRoles)
      .where(eq(adminRoles.userId, userId))
      .returning({ userId: adminRoles.userId });
    return rows.length > 0;
  }

  async listRoles(): Promise<AdminRoleRow[]> {
    return this.db.select().from(adminRoles).orderBy(desc(adminRoles.createdAt));
  }

  async log(entry: {
    adminId: number;
    action: string;
    targetUserId?: number | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(adminLogs).values({
      adminId: entry.adminId,
      action: entry.action,
      targetUserId: entry.targetUserId ?? null,
      reason: entry.reason ?? null,
      metadata: entry.metadata ?? {},
    });
  }

  async listLogs(limit = 20): Promise<AdminLogRow[]> {
    return this.db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit);
  }

  async deleteLogsBefore(date: Date): Promise<number> {
    const rows = await this.db
      .delete(adminLogs)
      .where(lt(adminLogs.createdAt, date))
      .returning({ id: adminLogs.id });
    return rows.length;
  }

  async getSetting(key: string): Promise<string | null> {
    const [row] = await this.db
      .select()
      .from(botSettings)
      .where(eq(botSettings.key, key))
      .limit(1);
    return row?.value ?? null;
  }

  async listSettings(): Promise<BotSettingRow[]> {
    return this.db.select().from(botSettings);
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db
      .insert(botSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: botSettings.key, set: { value, updatedAt: new Date() } });
  }

  async saveStatsSnapshot(payload: Record<string, number>): Promise<void> {
    await this.db.insert(statsSnapshots).values({ payload });
  }

  async latestStatsSnapshot(): Promise<Record<string, number> | null> {
    const [row] = await this.db
      .select()
      .from(statsSnapshots)
      .orderBy(desc(statsSnapshots.createdAt))
      .limit(1);
    return row?.payload ?? null;
  }
}
