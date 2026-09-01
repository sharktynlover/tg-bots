import { singleton } from 'tsyringe';
import type { BoostSource, UserRow } from '@/entities';
import { BoostRepository } from '@/repositories/boost.repository';
import { UserRepository } from '@/repositories/user.repository';
import { addHours } from '@/utils/date.utils';
import { logger } from '@/utils/logger';
import { SuperlikeService } from './superlike.service';

export type BoostResult = { ok: true; expiresAt: Date } | { ok: false; reason: 'no_superlikes' };

@singleton()
export class BoostService {
  constructor(
    private readonly boostRepository: BoostRepository,
    private readonly userRepository: UserRepository,
    private readonly superlikeService: SuperlikeService,
  ) {}

  /** Boost durations stack: a new boost extends the current expiry. */
  private nextExpiry(user: UserRow, hours: number): Date {
    const now = new Date();
    const base = user.boostExpiresAt && user.boostExpiresAt > now ? user.boostExpiresAt : now;
    return addHours(base, hours);
  }

  async activate(userId: number, hours: number, source: BoostSource): Promise<BoostResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) return { ok: false, reason: 'no_superlikes' };

    if (source === 'superlikes') {
      const consumed = await this.superlikeService.consume(userId, 1);
      if (!consumed) return { ok: false, reason: 'no_superlikes' };
    }

    const expiresAt = this.nextExpiry(user, hours);
    await this.boostRepository.create(userId, expiresAt, source);
    await this.userRepository.setBoostExpiry(userId, expiresAt);
    logger.info({ event: 'boost_activated', userId, hours, source }, 'boost activated');
    return { ok: true, expiresAt };
  }

  async expireOutdated(): Promise<number> {
    return this.userRepository.clearExpiredBoosts();
  }
}
