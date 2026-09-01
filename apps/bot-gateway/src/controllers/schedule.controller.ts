import type { Context } from 'grammy';
import { getWeekdayIndex, type WeekSchedule } from '@college/shared';
import { Callback, Command, Controller, Hears } from '../core/decorators';
import { daysKeyboard, type ScheduleScope } from '../keyboards/schedule.keyboard';
import { MainButtons } from '../keyboards/main.keyboard';
import { Common, Schedule } from '../messages';
import { ScheduleService } from '../services/schedule.service';
import { UserService } from '../services/user.service';

@Controller()
export class ScheduleController {
	constructor(
		private readonly users: UserService,
		private readonly schedule: ScheduleService,
	) {}

	@Command('schedule')
	@Hears(MainButtons.schedule)
	async show(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		const user = await this.users.find(telegramId);
		if (!user?.groupApiId) {
			await ctx.reply(Common.noGroup());
			return;
		}
		const week = await this.schedule.getWeek(user.groupApiId);
		if (!week || week.days.length === 0) {
			await ctx.reply(Schedule.emptyWeek());
			return;
		}
		const index = this.todayIndex(week);
		await ctx.reply(Schedule.day(week.days[index]!, user.scheduleFormat), {
			reply_markup: daysKeyboard(week, 'cur', index),
		});
	}

	@Command('preschedule')
	async preschedule(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		const user = await this.users.find(telegramId);
		if (!user?.groupApiId) {
			await ctx.reply(Common.noGroup());
			return;
		}
		const preschedule = await this.schedule.getPreSchedule(user.groupApiId);
		if (!preschedule || preschedule.week.days.length === 0) {
			await ctx.reply(Schedule.prescheduleEmpty());
			return;
		}
		const text = [
			Schedule.prescheduleHeader(),
			'',
			Schedule.day(preschedule.week.days[0]!, user.scheduleFormat),
			Schedule.prescheduleSource(preschedule.teachers),
		].join('\n');
		await ctx.reply(text, { reply_markup: daysKeyboard(preschedule.week, 'pre', 0) });
	}

	@Callback(/^sched:(cur|pre):(\d+)$/)
	async switchDay(ctx: Context): Promise<void> {
		await ctx.answerCallbackQuery();
		const telegramId = ctx.from?.id;
		const [, scopeRaw, indexRaw] = ctx.callbackQuery?.data?.split(':') ?? [];
		if (!telegramId || !scopeRaw || indexRaw === undefined) return;
		const scope = scopeRaw as ScheduleScope;
		const index = Number(indexRaw);
		const user = await this.users.find(telegramId);
		if (!user?.groupApiId) return;

		const preschedule =
			scope === 'pre' ? await this.schedule.getPreSchedule(user.groupApiId) : null;
		const week =
			scope === 'pre' ? (preschedule?.week ?? null) : await this.schedule.getWeek(user.groupApiId);
		const day = week?.days[index];
		if (!week || !day) return;

		const body = Schedule.day(day, user.scheduleFormat);
		const text =
			scope === 'pre'
				? [
						Schedule.prescheduleHeader(),
						'',
						body,
						Schedule.prescheduleSource(preschedule?.teachers ?? []),
					].join('\n')
				: body;
		await ctx.editMessageText(text, { reply_markup: daysKeyboard(week, scope, index) });
	}

	/** Сегодняшний день недели, если он есть в расписании, иначе первый. */
	private todayIndex(week: WeekSchedule): number {
		const today = getWeekdayIndex(new Date());
		const index = week.days.findIndex((day) => getWeekdayIndex(new Date(day.date)) === today);
		return index >= 0 ? index : 0;
	}
}
