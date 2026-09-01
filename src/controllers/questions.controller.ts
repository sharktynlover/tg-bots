import { injectable } from 'tsyringe';
import { Callback, Middleware } from '@/decorators';
import { cancelKeyboard } from '@/keyboards/main.keyboard';
import { MESSAGES } from '@/messages/ru';
import { QuestionService } from '@/services/question.service';
import type { BotContext } from '@/types/context';
import { render } from '@/utils/template';

@injectable()
export class QuestionsController {
  constructor(private readonly questionService: QuestionService) {}

  @Callback(/^question:answer:(\d+)$/)
  @Middleware('profile')
  async answer(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const questionId = Number(ctx.match?.[1]);
    if (!user || !Number.isInteger(questionId)) return;
    await ctx.answerCallbackQuery();

    const question = await this.questionService.findPending(questionId, user.id);
    if (!question) {
      await ctx.reply(MESSAGES.QUESTIONS.ALREADY_HANDLED);
      return;
    }

    await ctx.setSession({ step: 'answering_question', questionId });
    await ctx.reply(render(MESSAGES.QUESTIONS.ASK_ANSWER, { text: question.questionText }), {
      reply_markup: cancelKeyboard(),
    });
  }

  @Callback(/^question:ignore:(\d+)$/)
  @Middleware('profile')
  async ignore(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const questionId = Number(ctx.match?.[1]);
    if (!user || !Number.isInteger(questionId)) return;
    await ctx.answerCallbackQuery();

    const question = await this.questionService.findPending(questionId, user.id);
    if (!question) {
      await ctx.reply(MESSAGES.QUESTIONS.ALREADY_HANDLED);
      return;
    }

    await this.questionService.ignore(questionId);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    await ctx.reply(MESSAGES.QUESTIONS.IGNORED);
  }
}
