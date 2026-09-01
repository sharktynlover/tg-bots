import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { inject, singleton } from 'tsyringe';
import { sql } from 'drizzle-orm';
import { DATABASE_TOKEN, type Database } from '@/config/database.config';
import { REDIS_TOKEN, type RedisClient } from '@/config/redis.config';
import { env } from '@/config/env.config';
import {
  adminLogs,
  adminRoles,
  blacklist,
  boosts,
  botSettings,
  likes,
  matches,
  questions,
  referrals,
  reports,
  statsSnapshots,
  userPhotos,
  users,
  type AdminRole,
  type AdminRoleRow,
  type UserRow,
} from '@/entities';
import { AdminRepository } from '@/repositories/admin.repository';
import { StatsRepository, type BotStats } from '@/repositories/stats.repository';
import { UserRepository } from '@/repositories/user.repository';
import { logger } from '@/utils/logger';

const ERROR_LOG_KEY = 'logs:errors';
const ERROR_LOG_LIMIT = 50;

export interface AdminActionEntry {
  adminId: number;
  action: string;
  targetUserId?: number | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export type DatabaseDump = Record<string, unknown[]>;

@singleton()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userRepository: UserRepository,
    private readonly statsRepository: StatsRepository,
    @inject(DATABASE_TOKEN) private readonly db: Database,
    @inject(REDIS_TOKEN) private readonly redis: RedisClient,
  ) {}

  /** Admin actions are persisted twice: a plain text file and `admin_logs`. */
  async logAction(entry: AdminActionEntry): Promise<void> {
    await this.adminRepository.log(entry);
    logger.info({ event: 'admin_action', ...entry }, 'admin action');

    const line = `${new Date().toISOString()} admin=${entry.adminId} action=${entry.action} target=${
      entry.targetUserId ?? '-'
    } reason=${entry.reason ?? '-'}\n`;
    const filePath = join(dirname(env.LOG_FILE_PATH), 'admin-actions.log');
    try {
      await mkdir(dirname(filePath), { recursive: true });
      await appendFile(filePath, line, 'utf8');
    } catch (error) {
      logger.warn({ event: 'admin_log_file_failed', error: String(error) }, 'file log skipped');
    }
  }

  async recordError(error: unknown, context: Record<string, unknown> = {}): Promise<void> {
    const payload = JSON.stringify({
      time: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join(' | ') : undefined,
      ...context,
    });
    await this.redis.lpush(ERROR_LOG_KEY, payload);
    await this.redis.ltrim(ERROR_LOG_KEY, 0, ERROR_LOG_LIMIT - 1);
  }

  async listErrors(limit = 10): Promise<string[]> {
    return this.redis.lrange(ERROR_LOG_KEY, 0, limit - 1);
  }

  async ban(adminId: number, targetId: number, reason: string | null): Promise<boolean> {
    const user = await this.userRepository.findById(targetId);
    if (!user) return false;
    await this.userRepository.setBanned(targetId, true);
    await this.logAction({ adminId, action: 'ban', targetUserId: targetId, reason });
    return true;
  }

  async unban(adminId: number, targetId: number): Promise<boolean> {
    const user = await this.userRepository.findById(targetId);
    if (!user) return false;
    await this.userRepository.setBanned(targetId, false);
    await this.logAction({ adminId, action: 'unban', targetUserId: targetId });
    return true;
  }

  async deleteUser(adminId: number, targetId: number): Promise<boolean> {
    const user = await this.userRepository.findById(targetId);
    if (!user) return false;
    await this.userRepository.delete(targetId);
    await this.logAction({ adminId, action: 'delete_user', targetUserId: targetId });
    return true;
  }

  async viewUser(targetId: number): Promise<UserRow | null> {
    return this.userRepository.findById(targetId);
  }

  async addAdmin(developerId: number, targetId: number, role: AdminRole = 'admin'): Promise<void> {
    await this.adminRepository.grantRole(targetId, role, developerId);
    await this.logAction({ adminId: developerId, action: 'add_admin', targetUserId: targetId });
  }

  async removeAdmin(developerId: number, targetId: number): Promise<boolean> {
    const removed = await this.adminRepository.revokeRole(targetId);
    if (removed) {
      await this.logAction({ adminId: developerId, action: 'remove_admin', targetUserId: targetId });
    }
    return removed;
  }

  async listAdmins(): Promise<AdminRoleRow[]> {
    return this.adminRepository.listRoles();
  }

  async stats(): Promise<BotStats> {
    return this.statsRepository.collect();
  }

  async snapshotStats(): Promise<BotStats> {
    const stats = await this.statsRepository.collect();
    await this.adminRepository.saveStatsSnapshot(stats as unknown as Record<string, number>);
    return stats;
  }

  async listLogs(limit = 20) {
    return this.adminRepository.listLogs(limit);
  }

  async exportDatabase(): Promise<DatabaseDump> {
    const [
      usersRows,
      photosRows,
      likesRows,
      matchesRows,
      reportsRows,
      blacklistRows,
      referralsRows,
      boostsRows,
      questionsRows,
      adminRoleRows,
      adminLogRows,
      settingsRows,
    ] = await Promise.all([
      this.db.select().from(users),
      this.db.select().from(userPhotos),
      this.db.select().from(likes),
      this.db.select().from(matches),
      this.db.select().from(reports),
      this.db.select().from(blacklist),
      this.db.select().from(referrals),
      this.db.select().from(boosts),
      this.db.select().from(questions),
      this.db.select().from(adminRoles),
      this.db.select().from(adminLogs),
      this.db.select().from(botSettings),
    ]);

    return {
      users: usersRows,
      user_photos: photosRows,
      likes: likesRows,
      matches: matchesRows,
      reports: reportsRows,
      blacklist: blacklistRows,
      referrals: referralsRows,
      boosts: boostsRows,
      questions: questionsRows,
      admin_roles: adminRoleRows,
      admin_logs: adminLogRows,
      bot_settings: settingsRows,
    };
  }

  async dropDatabase(adminId: number): Promise<void> {
    await this.db.execute(sql`
      TRUNCATE TABLE
        ${statsSnapshots}, ${adminLogs}, ${adminRoles}, ${botSettings}, ${questions},
        ${boosts}, ${referrals}, ${blacklist}, ${reports}, ${matches}, ${likes},
        ${userPhotos}, ${users}
      RESTART IDENTITY CASCADE
    `);
    await this.logAction({ adminId, action: 'drop_db' });
  }

  /** Restores a dump produced by {@link exportDatabase}; existing rows are kept. */
  async importDatabase(adminId: number, dump: DatabaseDump): Promise<number> {
    const registry = {
      users,
      user_photos: userPhotos,
      likes,
      matches,
      reports,
      blacklist,
      referrals,
      boosts,
      questions,
      admin_roles: adminRoles,
      admin_logs: adminLogs,
      bot_settings: botSettings,
    } as const;

    let imported = 0;
    for (const [name, table] of Object.entries(registry)) {
      const rows = dump[name];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const parsed = rows.map((row) => this.reviveDates(row as Record<string, unknown>));
      await this.db
        .insert(table)
        .values(parsed as never)
        .onConflictDoNothing();
      imported += rows.length;
    }

    await this.logAction({ adminId, action: 'import_db', metadata: { imported } });
    return imported;
  }

  private reviveDates(row: Record<string, unknown>): Record<string, unknown> {
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === 'string' && isoPattern.test(value) ? new Date(value) : value,
      ]),
    );
  }
}
