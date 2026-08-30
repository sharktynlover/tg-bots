import { injectable } from 'tsyringe';
import { Callback, Command, Hears, Middleware } from '@/decorators';
import { incomingLikeKeyboard } from '@/keyboards/swipe.keyboard';
import { BUTTONS, MESSAGES } from '@/messages/ru';
import { LikeRepository } from '@/repositories/like.repository';
import { FeedService } from '@/services/feed.service';
import { LikeService } from '@/services/like.service';
import { ProfileService } from '@/services/profile.service';
import type { BotContext } from '@/types/context';
import { render } from '@/utils/template';

@injectable()
export class LikesController {
  constructor(
    private readonly likeRepository: LikeRepository,
    private readonly likeService: LikeService,
    private readonly profileService: ProfileService,
    private readonly feedService: FeedService,
  ) {}

  @Command('likes')
  @Hears(BUTTONS.MAIN.LIKES)
  @Middleware('profile')
  async openQueue(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;

    const count = await this.likeRepository.countUnseen(user.id);
    if (count === 0) {
      await ctx.reply(MESSAGES.LIKES.NO_INCOMING_LIKES);
      await this.feedService.sendNext(ctx, user);
      return;
    }

    await ctx.reply(render(MESSAGES.LIKES.COUNTER, { count }));
    await this.sendNextIncoming(ctx);
  }

  @Callback(/^likes:accept:(\d+)$/)
  @Middleware('profile')
  async accept(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const senderId = Number(ctx.match?.[1]);
    if (!user || !Number.isInteger(senderId)) return;

    const outcome = await this.likeService.processLike(user, senderId, 'like');
    await ctx.answerCallbackQuery({
      text: outcome.kind === 'sent' ? MESSAGES.LIKES.LIKE_SENT : MESSAGES.ERRORS.PROFILE_UNAVAILABLE,
    });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    await this.sendNextIncoming(ctx);
  }

  @Callback(/^likes:decline:(\d+)$/)
  @Middleware('profile')
  async decline(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const senderId = Number(ctx.match?.[1]);
    if (!user || !Number.isInteger(senderId)) return;

    await this.likeRepository.markSeen(senderId, user.id);
    await ctx.answerCallbackQuery({ text: MESSAGES.LIKES.SKIPPED });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    await this.sendNextIncoming(ctx);
  }

  /** Walks the incoming-likes queue; falls back to the feed once it is empty. */
  private async sendNextIncoming(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;

    const incoming = await this.likeRepository.nextIncoming(user.id);
    if (!incoming) {
      await ctx.reply(MESSAGES.LIKES.QUEUE_EMPTY);
      await this.feedService.sendNext(ctx, user);
      return;
    }

    const card = await this.profileService.getCard(incoming.sender.id);
    if (!card) {
      await this.likeRepository.markSeen(incoming.sender.id, user.id);
      await this.sendNextIncoming(ctx);
      return;
    }

    await this.likeRepository.markSeen(incoming.sender.id, user.id);
    const header = render(
      incoming.like.type === 'superlike'
        ? MESSAGES.LIKES.SUPER_LIKE_RECEIVED
        : MESSAGES.LIKES.LIKE_RECEIVED,
      { name: incoming.sender.name ?? '' },
    );
    await this.profileService.sendCard(user.id, card, {
      header,
      keyboard: incomingLikeKeyboard(incoming.sender.id),
    });
  }
}
