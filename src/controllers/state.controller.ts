import { injectable } from 'tsyringe';
import { On } from '@/decorators';
import { mainKeyboard } from '@/keyboards/main.keyboard';
import { MESSAGES } from '@/messages/ru';
import { FeedService } from '@/services/feed.service';
import { ProfileWizardService } from '@/services/profile-wizard.service';
import { QuestionService } from '@/services/question.service';
import { ReportService } from '@/services/report.service';
import { questionTextValidator, reportReasonValidator } from '@/validators/question.validator';
import type { BotContext } from '@/types/context';

/**
 * Terminal handler for free-form input: routes text and photos to whatever the
 * user is currently doing (profile wizard, anonymous question, report, ...).
 */
@injectable()
export class StateController {
  constructor(
    private readonly wizard: ProfileWizardService,
    private readonly questionService: QuestionService,
    private readonly reportService: ReportService,
    private readonly feedService: FeedService,
  ) {}

  @On('message:photo')
  async onPhoto(ctx: BotContext): Promise<void> {
    const { step } = ctx.session;
    if (step === 'creating' || step === 'editing') {
      await this.wizard.handleInput(ctx);
      return;
    }
    await ctx.reply(MESSAGES.COMMON.UNKNOWN_COMMAND);
  }

  @On('message:text')
  async onText(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const text = ctx.message?.text?.trim() ?? '';
    if (!user) return;

    switch (ctx.session.step) {
      case 'creating':
      case 'editing':
        await this.wizard.handleInput(ctx);
        return;

      case 'asking_question': {
        const parsed = questionTextValidator.safeParse(text);
        if (!parsed.success) {
          await ctx.reply(MESSAGES.QUESTIONS.TOO_LONG);
          return;
        }
        const targetId = ctx.session.targetUserId;
        const result = await this.questionService.ask(user, targetId, parsed.data);
        await ctx.setSession({ step: 'idle' });
        if (!result.ok) {
          await ctx.reply(
            result.reason === 'liked'
              ? MESSAGES.QUESTIONS.NOT_ALLOWED_LIKED
              : MESSAGES.QUESTIONS.NOT_ALLOWED_BLACKLIST,
            { reply_markup: mainKeyboard(true) },
          );
          return;
        }
        await ctx.reply(MESSAGES.QUESTIONS.SENT, { reply_markup: mainKeyboard(true) });
        await this.feedService.sendNext(ctx, user);
        return;
      }

      case 'answering_question': {
        const questionId = ctx.session.questionId;
        const question = await this.questionService.findPending(questionId, user.id);
        await ctx.setSession({ step: 'idle' });
        if (!question) {
          await ctx.reply(MESSAGES.QUESTIONS.ALREADY_HANDLED, { reply_markup: mainKeyboard(true) });
          return;
        }
        const parsed = questionTextValidator.safeParse(text);
        if (!parsed.success) {
          await ctx.reply(MESSAGES.QUESTIONS.TOO_LONG);
          return;
        }
        await this.questionService.answer(question, user, parsed.data);
        await ctx.reply(MESSAGES.QUESTIONS.ANSWER_SENT, { reply_markup: mainKeyboard(true) });
        return;
      }

      case 'reporting': {
        const parsed = reportReasonValidator.safeParse(text);
        if (!parsed.success) {
          await ctx.reply(MESSAGES.REPORTS.ASK_REASON);
          return;
        }
        const targetId = ctx.session.targetUserId;
        await this.reportService.create(user, targetId, parsed.data);
        await ctx.setSession({ step: 'idle' });
        await ctx.reply(MESSAGES.REPORTS.SENT, { reply_markup: mainKeyboard(true) });
        await this.feedService.sendNext(ctx, user);
        return;
      }

      default:
        await ctx.reply(MESSAGES.COMMON.UNKNOWN_COMMAND, {
          reply_markup: mainKeyboard(user.isProfileComplete),
        });
    }
  }
}
