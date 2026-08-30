import { injectable } from 'tsyringe';
import { Callback, Command, Hears, Middleware } from '@/decorators';
import { cancelKeyboard } from '@/keyboards/main.keyboard';
import { BUTTONS, MESSAGES } from '@/messages/ru';
import { FeedService } from '@/services/feed.service';
import { LikeService } from '@/services/like.service';
import { QuestionService } from '@/services/question.service';
import { ReportService } from '@/services/report.service';
import type { BotContext } from '@/types/context';
import type { LikeType } from '@/entities';
import { render } from '@/utils/template';

@injectable()
export class SwipeController {
  constructor(
    private readonly feedService: FeedService,
    private readonly likeService: LikeService,
    private readonly questionService: QuestionService,
    private readonly reportService: ReportService,
  ) {}

  @Command('feed')
  @Hears(BUTTONS.MAIN.FEED)
  @Middleware('profile')
  async openFeed(ctx: BotContext): Promise<void> {
    if (!ctx.user) return;
    await ctx.setSession({ step: 'idle' });
    await this.feedService.sendNext(ctx, ctx.user);
  }

  @Callback(/^feed:(like|superlike):(\d+)$/)
  @Middleware('profile')
  async like(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const type = ctx.match?.[1] as LikeType | undefined;
    const targetId = Number(ctx.match?.[2]);
    if (!user || !type || !Number.isInteger(targetId)) return;

    const outcome = await this.likeService.processLike(user, targetId, type);
    switch (outcome.kind) {
      case 'cooldown':
        await ctx.answerCallbackQuery({
          text: render(MESSAGES.COMMON.LIKE_COOLDOWN, { minutes: outcome.retryAfterMinutes }),
          show_alert: true,
        });
        return;
      case 'no_superlikes':
        await ctx.answerCallbackQuery({
          text: MESSAGES.LIKES.SUPERLIKE_EXHAUSTED,
          show_alert: true,
        });
        return;
      case 'unavailable':
        await ctx.answerCallbackQuery({ text: MESSAGES.ERRORS.PROFILE_UNAVAILABLE });
        break;
      case 'sent':
        await ctx.answerCallbackQuery({
          text: type === 'superlike' ? MESSAGES.LIKES.SUPERLIKE_SENT : MESSAGES.LIKES.LIKE_SENT,
        });
        break;
    }

    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    const refreshed = (await this.refreshUser(ctx)) ?? user;
    await this.feedService.sendNext(ctx, refreshed);
  }

  @Callback(/^feed:skip:(\d+)$/)
  @Middleware('profile')
  async skip(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const targetId = Number(ctx.match?.[1]);
    if (!user || !Number.isInteger(targetId)) return;

    await this.likeService.registerSkip(user.id, targetId);
    await ctx.answerCallbackQuery({ text: MESSAGES.LIKES.SKIPPED });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    await this.feedService.sendNext(ctx, user);
  }

  @Callback(/^feed:question:(\d+)$/)
  @Middleware('profile')
  async askQuestion(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const targetId = Number(ctx.match?.[1]);
    if (!user || !Number.isInteger(targetId)) return;
    await ctx.answerCallbackQuery();

    if (!(await this.questionService.canAsk(user.id, targetId))) {
      await ctx.reply(MESSAGES.QUESTIONS.NOT_ALLOWED_LIKED);
      return;
    }

    await ctx.setSession({ step: 'asking_question', targetUserId: targetId });
    await ctx.reply(MESSAGES.QUESTIONS.ASK_TEXT, { reply_markup: cancelKeyboard() });
  }

  @Callback(/^(?:feed|likes):report:(\d+)$/)
  @Middleware('profile')
  async report(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const targetId = Number(ctx.match?.[1]);
    if (!user || !Number.isInteger(targetId)) return;
    await ctx.answerCallbackQuery();

    if (await this.reportService.hasReported(user.id, targetId)) {
      await ctx.reply(MESSAGES.REPORTS.ALREADY_REPORTED);
      return;
    }

    await ctx.setSession({ step: 'reporting', targetUserId: targetId });
    await ctx.reply(MESSAGES.REPORTS.ASK_REASON, { reply_markup: cancelKeyboard() });
  }

  private async refreshUser(ctx: BotContext) {
    if (!ctx.user) return null;
    const fresh = await this.feedService.reloadViewer(ctx.user.id);
    if (fresh) ctx.user = fresh;
    return fresh;
  }
}
