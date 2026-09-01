import { randomBytes } from 'node:crypto';
import { singleton } from 'tsyringe';
import { env } from '@/config/env.config';
import type { AdminRole, UserRow } from '@/entities';
import { UserRepository } from '@/repositories/user.repository';
import { AdminRepository } from '@/repositories/admin.repository';

@singleton()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  private static generateReferralCode(): string {
    return randomBytes(6).toString('base64url').slice(0, 10);
  }

  async findOrCreate(id: number, username: string | null): Promise<UserRow> {
    const existing = await this.userRepository.findById(id);
    if (existing) {
      if (existing.username !== username) {
        await this.userRepository.touchActivity(id, username);
        return { ...existing, username };
      }
      await this.userRepository.touchActivity(id, username);
      return existing;
    }

    return this.userRepository.create({
      id,
      username,
      referralCode: UserService.generateReferralCode(),
    });
  }

  async findById(id: number): Promise<UserRow | null> {
    return this.userRepository.findById(id);
  }

  /** Config-file roles always win over DB roles so a locked-out developer can recover. */
  async resolveRole(userId: number): Promise<AdminRole | null> {
    if (userId === env.DEVELOPER_TELEGRAM_ID) return 'developer';
    if (env.ADMIN_TELEGRAM_IDS.includes(userId)) return 'admin';
    const row = await this.adminRepository.findRole(userId);
    return row?.role ?? null;
  }

  async isDeveloper(userId: number): Promise<boolean> {
    return (await this.resolveRole(userId)) === 'developer';
  }

  async syncConfiguredRoles(): Promise<void> {
    await this.adminRepository.grantRole(env.DEVELOPER_TELEGRAM_ID, 'developer', null);
    for (const adminId of env.ADMIN_TELEGRAM_IDS) {
      await this.adminRepository.grantRole(adminId, 'admin', env.DEVELOPER_TELEGRAM_ID);
    }
  }
}
