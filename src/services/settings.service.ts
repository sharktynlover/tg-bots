import { singleton } from 'tsyringe';
import { env } from '@/config/env.config';
import { AdminRepository } from '@/repositories/admin.repository';

export const CONFIGURABLE_SETTINGS = {
  SUPERLIKES_PER_WEEK: env.SUPERLIKES_PER_WEEK,
  MAX_PHOTOS: env.MAX_PHOTOS,
  MIN_AGE: env.MIN_AGE,
  MAX_AGE: env.MAX_AGE,
  MAX_DESCRIPTION_LENGTH: env.MAX_DESCRIPTION_LENGTH,
  SPAM_LIKE_THRESHOLD: env.SPAM_LIKE_THRESHOLD,
  SPAM_LIKE_MIN_ACTIONS: env.SPAM_LIKE_MIN_ACTIONS,
  SPAM_LIKE_COOLDOWN_SECONDS: env.SPAM_LIKE_COOLDOWN_SECONDS,
} as const;

export type SettingKey = keyof typeof CONFIGURABLE_SETTINGS;

const CACHE_TTL_MS = 30_000;

/** Runtime settings: DB overrides win over env defaults, cached in-process. */
@singleton()
export class SettingsService {
  private cache = new Map<SettingKey, { value: number; expiresAt: number }>();

  constructor(private readonly adminRepository: AdminRepository) {}

  static isSettingKey(key: string): key is SettingKey {
    return key in CONFIGURABLE_SETTINGS;
  }

  async get(key: SettingKey): Promise<number> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const stored = await this.adminRepository.getSetting(key);
    const parsed = stored === null ? Number.NaN : Number(stored);
    const value = Number.isFinite(parsed) ? parsed : CONFIGURABLE_SETTINGS[key];
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  async set(key: SettingKey, value: number): Promise<void> {
    await this.adminRepository.setSetting(key, String(value));
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  async all(): Promise<Record<SettingKey, number>> {
    const keys = Object.keys(CONFIGURABLE_SETTINGS) as SettingKey[];
    const entries = await Promise.all(keys.map(async (key) => [key, await this.get(key)] as const));
    return Object.fromEntries(entries) as Record<SettingKey, number>;
  }
}
