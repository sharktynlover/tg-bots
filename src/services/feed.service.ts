import { singleton } from 'tsyringe';
import type { UserRow } from '@/entities';
import { swipeKeyboard } from '@/keyboards/swipe.keyboard';
import { MESSAGES } from '@/messages/ru';
import type { BotContext } from '@/types/context';
import { UserRepository } from '@/repositories/user.repository';
import { MatchingService } from './matching.service';
import { ProfileService } from './profile.service';
import { QuestionService } from './question.service';

@singleton()
export class FeedService {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly profileService: ProfileService,
    private readonly questionService: QuestionService,
    private readonly userRepository: UserRepository,
  ) {}

  /** Re-reads the viewer so counters changed by the last action are up to date. */
  async reloadViewer(userId: number): Promise<UserRow | null> {
    return this.userRepository.findById(userId);
  }

  /** Sends the next feed profile, or the "no more profiles" notice. */
  async sendNext(ctx: BotContext, viewer: UserRow): Promise<void> {
    const candidate = await this.matchingService.nextCandidate(viewer);
    if (!candidate) {
      await ctx.reply(MESSAGES.COMMON.ANKETA_ENDED);
      return;
    }

    const card = await this.profileService.getCard(candidate.id);
    if (!card) {
      await ctx.reply(MESSAGES.COMMON.ANKETA_ENDED);
      return;
    }

    const canAskQuestion = await this.questionService.canAsk(viewer.id, candidate.id);
    await this.profileService.sendCard(viewer.id, card, {
      keyboard: swipeKeyboard({
        targetId: candidate.id,
        canSuperlike: viewer.superlikesAvailable > 0,
        canAskQuestion,
      }),
    });
  }
}
