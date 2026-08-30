import { inject, singleton } from 'tsyringe';
import { REDIS_TOKEN, type RedisClient } from '@/config/redis.config';
import type { UserRow } from '@/entities';
import { UserRepository } from '@/repositories/user.repository';

const SKIP_TTL_SECONDS = 60 * 60 * 24;

@singleton()
export class MatchingService {
  constructor(
    private readonly userRepository: UserRepository,
    @inject(REDIS_TOKEN) private readonly redis: RedisClient,
  ) {}

  private skipKey(userId: number): string {
    return `feed:skipped:${userId}`;
  }

  async markSkipped(viewerId: number, targetId: number): Promise<void> {
    await this.redis.sadd(this.skipKey(viewerId), String(targetId));
    await this.redis.expire(this.skipKey(viewerId), SKIP_TTL_SECONDS);
  }

  async resetSkips(viewerId: number): Promise<void> {
    await this.redis.del(this.skipKey(viewerId));
  }

  /**
   * Next profile for the feed. Skipped profiles are excluded until the feed runs
   * dry, then the skip list is cleared so they can appear again.
   */
  async nextCandidate(viewer: UserRow): Promise<UserRow | null> {
    if (!viewer.gender || !viewer.searchPreference) return null;

    const skipped = (await this.redis.smembers(this.skipKey(viewer.id))).map(Number);
    const candidate = await this.userRepository.findFeedCandidate({
      viewerId: viewer.id,
      viewerGender: viewer.gender,
      viewerPreference: viewer.searchPreference,
      excludeIds: skipped,
    });
    if (candidate) return candidate;
    if (skipped.length === 0) return null;

    await this.resetSkips(viewer.id);
    return this.userRepository.findFeedCandidate({
      viewerId: viewer.id,
      viewerGender: viewer.gender,
      viewerPreference: viewer.searchPreference,
      excludeIds: [],
    });
  }
}
