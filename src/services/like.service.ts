import { inject, singleton } from 'tsyringe';
import { REDIS_TOKEN, type RedisClient } from '@/config/redis.config';
import type { LikeType, UserRow } from '@/entities';
import { LikeRepository } from '@/repositories/like.repository';
import { MatchRepository } from '@/repositories/match.repository';
import { UserRepository } from '@/repositories/user.repository';
import { MESSAGES } from '@/messages/ru';
import { incomingLikeKeyboard } from '@/keyboards/swipe.keyboard';
import { render } from '@/utils/template';
import { logger } from '@/utils/logger';
import { ProfileService } from './profile.service';
import { SettingsService } from './settings.service';
import { MatchingService } from './matching.service';

export type LikeOutcome =
  | { kind: 'cooldown'; retryAfterMinutes: number }
  | { kind: 'no_superlikes' }
  | { kind: 'unavailable' }
  | { kind: 'sent'; mutual: false }
  | { kind: 'sent'; mutual: true; partner: UserRow };

const COUNTER_TTL_SECONDS = 60 * 60 * 24;

@singleton()
export class LikeService {
  constructor(
    private readonly likeRepository: LikeRepository,
    private readonly matchRepository: MatchRepository,
    private readonly userRepository: UserRepository,
    private readonly profileService: ProfileService,
    private readonly settingsService: SettingsService,
    private readonly matchingService: MatchingService,
    @inject(REDIS_TOKEN) private readonly redis: RedisClient,
  ) {}

  private cooldownKey(userId: number): string {
    return `like:cooldown:${userId}`;
  }

  private counterKey(userId: number, kind: 'like' | 'skip'): string {
    return `like:counter:${kind}:${userId}`;
  }

  async remainingCooldownMinutes(userId: number): Promise<number> {
    const ttl = await this.redis.ttl(this.cooldownKey(userId));
    return ttl > 0 ? Math.ceil(ttl / 60) : 0;
  }

  async registerSkip(userId: number, targetId: number): Promise<void> {
    await this.matchingService.markSkipped(userId, targetId);
    await this.bumpCounter(userId, 'skip');
  }

  private async bumpCounter(userId: number, kind: 'like' | 'skip'): Promise<number> {
    const key = this.counterKey(userId, kind);
    const value = await this.redis.incr(key);
    if (value === 1) await this.redis.expire(key, COUNTER_TTL_SECONDS);
    return value;
  }

  /** Applies the "likes everything" throttle: 1 like per cooldown window. */
  private async enforceSpamProtection(userId: number): Promise<void> {
    const [threshold, minActions, cooldownSeconds] = await Promise.all([
      this.settingsService.get('SPAM_LIKE_THRESHOLD'),
      this.settingsService.get('SPAM_LIKE_MIN_ACTIONS'),
      this.settingsService.get('SPAM_LIKE_COOLDOWN_SECONDS'),
    ]);

    const likeCount = Number((await this.redis.get(this.counterKey(userId, 'like'))) ?? 0);
    const skipCount = Number((await this.redis.get(this.counterKey(userId, 'skip'))) ?? 0);
    const total = likeCount + skipCount;
    if (total < minActions) return;
    if (likeCount / total < threshold) return;

    await this.redis.set(this.cooldownKey(userId), '1', 'EX', cooldownSeconds);
    logger.warn({ event: 'like_spam_throttled', userId, likeCount, skipCount }, 'like throttled');
  }

  async processLike(actor: UserRow, targetId: number, type: LikeType): Promise<LikeOutcome> {
    const target = await this.userRepository.findById(targetId);
    if (!target || target.isBanned || !target.isProfileComplete) return { kind: 'unavailable' };

    if (type === 'like') {
      const cooldown = await this.remainingCooldownMinutes(actor.id);
      if (cooldown > 0) return { kind: 'cooldown', retryAfterMinutes: cooldown };
    }

    if (type === 'superlike') {
      const consumed = await this.userRepository.consumeSuperlike(actor.id);
      if (!consumed) return { kind: 'no_superlikes' };
    }

    await this.likeRepository.upsert(actor.id, targetId, type);
    if (type === 'like') {
      await this.bumpCounter(actor.id, 'like');
      await this.enforceSpamProtection(actor.id);
    }

    const reciprocal = await this.likeRepository.find(targetId, actor.id);
    if (reciprocal) {
      await this.matchRepository.create(actor.id, targetId);
      await this.likeRepository.markSeen(targetId, actor.id);
      await this.likeRepository.markSeen(actor.id, targetId);
      await this.notifyMatch(actor, target);
      logger.info({ event: 'match_created', userId: actor.id, partnerId: targetId }, 'match');
      return { kind: 'sent', mutual: true, partner: target };
    }

    await this.notifyIncomingLike(actor, target, type);
    logger.info({ event: 'like_sent', userId: actor.id, targetId, type }, 'like');
    return { kind: 'sent', mutual: false };
  }

  private mutualText(partner: UserRow): string {
    return partner.username
      ? render(MESSAGES.LIKES.MUTUAL_LIKE, { username: partner.username })
      : MESSAGES.LIKES.MUTUAL_LIKE_NO_USERNAME;
  }

  async notifyMatch(userA: UserRow, userB: UserRow): Promise<void> {
    const [cardA, cardB] = await Promise.all([
      this.profileService.getCard(userA.id),
      this.profileService.getCard(userB.id),
    ]);
    if (cardB) await this.profileService.sendCard(userA.id, cardB, { header: this.mutualText(userB) });
    if (cardA) await this.profileService.sendCard(userB.id, cardA, { header: this.mutualText(userA) });
  }

  private async notifyIncomingLike(actor: UserRow, target: UserRow, type: LikeType): Promise<void> {
    const card = await this.profileService.getCard(actor.id);
    if (!card) return;
    const unseen = await this.likeRepository.countUnseen(target.id);
    const header = [
      render(
        type === 'superlike' ? MESSAGES.LIKES.SUPER_LIKE_RECEIVED : MESSAGES.LIKES.LIKE_RECEIVED,
        { name: actor.name ?? '' },
      ),
      render(MESSAGES.LIKES.COUNTER, { count: unseen }),
    ].join('\n');

    await this.profileService.sendCard(target.id, card, {
      header,
      keyboard: incomingLikeKeyboard(actor.id),
    });
  }

  async countUnseen(userId: number): Promise<number> {
    return this.likeRepository.countUnseen(userId);
  }
}
