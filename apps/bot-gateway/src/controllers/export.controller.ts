import { InputFile, type Context } from 'grammy';
import { countLessons, GroupTitleById } from '@college/shared';
import { Command, Controller, Hears } from '../core/decorators';
import { MainButtons } from '../keyboards/main.keyboard';
import { Common, Export } from '../messages';
import { ExportService } from '../services/export.service';
import { ScheduleService } from '../services/schedule.service';
import { UserService } from '../services/user.service';

@Controller()
export class ExportController {
	constructor(
		private readonly users: UserService,
		private readonly schedule: ScheduleService,
		private readonly exporter: ExportService,
	) {}

	@Command('export')
	@Hears(MainButtons.export)
	async export(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		const user = await this.users.find(telegramId);
		if (!user?.groupApiId) {
			await ctx.reply(Common.noGroup());
			return;
		}
		const week = await this.schedule.getWeek(user.groupApiId);
		if (!week || countLessons(week) === 0) {
			await ctx.reply(Export.empty());
			return;
		}
		const title = GroupTitleById[user.groupApiId] ?? user.groupApiId;
		const file = new InputFile(this.exporter.build(week, title), `${user.groupApiId}.ics`);
		await ctx.replyWithDocument(file, { caption: Export.caption(title) });
	}
}
