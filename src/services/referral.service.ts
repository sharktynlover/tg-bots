import { inject, singleton } from 'tsyringe';
import { BOT_API_TOKEN, type BotApi } from '@/bot';
import type { UserRow } from '@/entities';
import { ReferralRepository, type ReferralStats } from '@/repositories/referral.repository';
import { UserRepository } from '@/repositories/user.repository';
import { MESSAGES } from '@/messages/ru';
import { render } from '@/utils/template';
import { logger } from '@/utils/logger';
import { trySend } from '@/utils/telegram.utils';
import { BoostService } from './boost.service';
import { SuperlikeService } from './superlike.service';

/** Invites 1-3 grant a superlike, every invite after that grants a 6h boost. */
const SUPERLIKE_REWARD_LIMIT = 3;
const BOOST_REWARD_HOURS = 6;

@singleton()
export class ReferralService {
  constructor(
    private readonly referralRepository: ReferralRepository,
    private readonly userRepository: UserRepository,
    private readonly superlikeService: SuperlikeService,
    private readonly boostService: BoostService,
    @inject(BOT_API_TOKEN) private readonly api: BotApi,
  ) {}

  static parseStartPayload(payload: string | undefined): string | null {
    if (!payload) return null;
    const match = /^ref_(.+)$/.exec(payload.trim());
    return match?.[1] ?? null;
  }

  async link(user: UserRow, botUsername: string): Promise<string> {
    return `https://t.me/${botUsername}?start=ref_${user.referralCode}`;
  }

  async stats(userId: number): Promise<ReferralStats> {
    return this.referralRepository.statsForReferrer(userId);
  }

  /** Records the pending invite; the reward is paid once the profile is completed. */
  async attachReferrer(user: UserRow, referralCode: string): Promise<boolean> {
    if (user.referredBy || user.isProfileComplete) return false;
    const referrer = await this.userRepository.findByReferralCode(referralCode);
    if (!referrer || referrer.id === user.id) return false;
    await this.userRepository.update(user.id, { referredBy: referrer.id });
    return true;
  }

  async rewardOnProfileCompletion(user: UserRow): Promise<void> {
    if (!user.referredBy) return;
    if (await this.referralRepository.exists(user.id)) return;

    const referrerId = user.referredBy;
    const alreadyRewarded = await this.referralRepository.countForReferrer(referrerId);
    const rewardType = alreadyRewarded < SUPERLIKE_REWARD_LIMIT ? 'superlike' : 'boost';

    if (rewardType === 'superlike') {
      await this.superlikeService.grant(referrerId, 1);
    } else {
      await this.boostService.activate(referrerId, BOOST_REWARD_HOURS, 'referral');
    }

    const created = await this.referralRepository.create(referrerId, user.id, rewardType, 1);
    if (!created) return;

    const message = render(
      rewardType === 'superlike'
        ? MESSAGES.REFERRAL.REWARD_SUPERLIKE
        : MESSAGES.REFERRAL.REWARD_BOOST,
      { name: user.name ?? '' },
    );
    await trySend(() => this.api.sendMessage(referrerId, message));
    logger.info({ event: 'referral_rewarded', referrerId, referredId: user.id, rewardType }, 'referral');
  }
}
