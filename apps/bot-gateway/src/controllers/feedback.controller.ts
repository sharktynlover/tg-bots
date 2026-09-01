import type { Context } from 'grammy';
import { Command, Controller, Hears } from '../core/decorators';
import { MainButtons } from '../keyboards/main.keyboard';
import { Feedback } from '../messages';
import { FeedbackService } from '../services/feedback.service';
import { StateService } from '../services/state.service';

@Controller()
export class FeedbackController {
	constructor(
		private readonly feedback: FeedbackService,
		private readonly state: StateService,
	) {}

	@Command('feedback')
	async feedbackCommand(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		const text = ctx.match?.toString().trim() ?? '';
		if (!text) {
			await this.state.set(telegramId, 'feedback');
			await ctx.reply(Feedback.ask());
			return;
		}
		await this.send(ctx, text);
	}

	@Hears(MainButtons.feedback)
	async ask(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		await this.state.set(telegramId, 'feedback');
		await ctx.reply(Feedback.ask());
	}

	async send(ctx: Context, text: string): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		const delivered = await this.feedback.sendToAdmins(telegramId, ctx.from?.username, text);
		await ctx.reply(delivered ? Feedback.sent() : Feedback.noAdmins());
	}
}
