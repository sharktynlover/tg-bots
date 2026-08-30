import type { Context } from 'grammy';
import { GroupTitleById, type ScheduleFormat } from '@college/shared';
import { Callback, Command, Controller, Hears } from '../core/decorators';
import { MainButtons } from '../keyboards/main.keyboard';
import { settingsKeyboard } from '../keyboards/settings.keyboard';
import { Common, Settings } from '../messages';
import { UserService } from '../services/user.service';

@Controller()
export class SettingsController {
	constructor(private readonly users: UserService) {}

	@Command('settings')
	@Hears(MainButtons.settings)
	async show(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		const user = await this.users.find(telegramId);
		if (!user?.groupApiId) {
			await ctx.reply(Common.noGroup());
			return;
		}
		await ctx.reply(
			Settings.title(
				GroupTitleById[user.groupApiId] ?? user.groupApiId,
				user.reminderOffset,
				user.scheduleFormat,
			),
			{ reply_markup: settingsKeyboard(user.reminderOffset, user.scheduleFormat) },
		);
	}

	@Callback(/^set:rem:(\d+|off)$/)
	async setReminder(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		const raw = ctx.callbackQuery?.data?.split(':')[2];
		if (!telegramId || !raw) return;
		const offset = raw === 'off' ? null : Number(raw);
		await this.users.setReminderOffset(telegramId, offset);
		await ctx.answerCallbackQuery(Settings.reminderSaved(offset));
		await this.refresh(ctx, telegramId);
	}

	@Callback(/^set:fmt:(detailed|compact)$/)
	async setFormat(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		const format = ctx.callbackQuery?.data?.split(':')[2] as ScheduleFormat | undefined;
		if (!telegramId || !format) return;
		await this.users.setScheduleFormat(telegramId, format);
		await ctx.answerCallbackQuery(Settings.formatSaved(format));
		await this.refresh(ctx, telegramId);
	}

	private async refresh(ctx: Context, telegramId: number): Promise<void> {
		const user = await this.users.find(telegramId);
		if (!user?.groupApiId) return;
		await ctx.editMessageText(
			Settings.title(
				GroupTitleById[user.groupApiId] ?? user.groupApiId,
				user.reminderOffset,
				user.scheduleFormat,
			),
			{ reply_markup: settingsKeyboard(user.reminderOffset, user.scheduleFormat) },
		);
	}
}
