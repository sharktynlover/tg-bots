import type { Context } from 'grammy';
import { isSameCollegeDay } from '@college/shared';
import { Command, Controller, Hears } from '../core/decorators';
import { MainButtons } from '../keyboards/main.keyboard';
import { Common, Schedule } from '../messages';
import { ScheduleService } from '../services/schedule.service';
import { UserService } from '../services/user.service';

@Controller()
export class NextController {
	constructor(
		private readonly users: UserService,
		private readonly schedule: ScheduleService,
	) {}

	@Command('next')
	@Hears(MainButtons.next)
	async next(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		const user = await this.users.find(telegramId);
		if (!user?.groupApiId) {
			await ctx.reply(Common.noGroup());
			return;
		}
		const week = await this.schedule.getWeek(user.groupApiId);
		if (!week) {
			await ctx.reply(Schedule.emptyWeek());
			return;
		}
		const now = new Date();
		const lesson = this.schedule.findNextLesson(week, now);
		if (!lesson) {
			await ctx.reply(Schedule.noNext());
			return;
		}
		const start = new Date(lesson.start);
		if (isSameCollegeDay(start, now)) {
			await ctx.reply(Schedule.next(lesson, start.getTime() - now.getTime()));
			return;
		}
		await ctx.reply(Schedule.nextTomorrow(lesson));
	}
}
