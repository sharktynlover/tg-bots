import type { Context } from 'grammy';
import { env } from '@college/shared';
import { Controller, Text } from '../core/decorators';
import { Common, Feedback } from '../messages';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from '../services/feedback.service';
import { NavigationController } from './navigation.controller';
import { StateService } from '../services/state.service';

/**
 * Последний в цепочке обработчик текста: закрывает пошаговые сценарии
 * (номер кабинета, фидбек) и ответы администраторов на пересланный фидбек.
 */
@Controller()
export class TextController {
	constructor(
		private readonly state: StateService,
		private readonly navigation: NavigationController,
		private readonly feedbackController: FeedbackController,
		private readonly feedback: FeedbackService,
	) {}

	@Text()
	async handle(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		const text = ctx.message?.text?.trim();
		if (!telegramId || !text) return;

		if (await this.tryAdminReply(ctx, telegramId, text)) return;

		const pending = await this.state.take(telegramId);
		if (pending === 'cabinet') {
			await this.navigation.answer(ctx, text);
			return;
		}
		if (pending === 'feedback') {
			await this.feedbackController.send(ctx, text);
			return;
		}
		await ctx.reply(Common.unknown());
	}

	private async tryAdminReply(ctx: Context, telegramId: number, text: string): Promise<boolean> {
		const replied = ctx.message?.reply_to_message?.text;
		if (!replied || !env.adminIds.includes(telegramId)) return false;
		const studentId = this.feedback.extractStudentId(replied);
		if (!studentId) return false;
		const delivered = await this.feedback.replyToStudent(studentId, text);
		await ctx.reply(delivered ? Feedback.replySent() : Feedback.replyFailed());
		return true;
	}
}
