import type { Context } from 'grammy';
import { findSpecialty, GroupTitleById, publish, Queues } from '@college/shared';
import { Callback, Command, Controller } from '../core/decorators';
import {
	coursesKeyboard,
	groupsKeyboard,
	specialtiesKeyboard,
} from '../keyboards/registration.keyboard';
import { mainKeyboard } from '../keyboards/main.keyboard';
import { Common, Registration } from '../messages';
import { UserService } from '../services/user.service';
import { StateService } from '../services/state.service';

@Controller()
export class RegistrationController {
	constructor(
		private readonly users: UserService,
		private readonly state: StateService,
	) {}

	@Command('start')
	async start(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		await this.state.clear(telegramId);
		await this.users.getOrCreate(telegramId);
		await ctx.reply(Registration.welcome(), { reply_markup: specialtiesKeyboard() });
	}

	@Command('help')
	async help(ctx: Context): Promise<void> {
		await ctx.reply(Common.help());
	}

	@Callback('reg:back:spec')
	async backToSpecialties(ctx: Context): Promise<void> {
		await ctx.answerCallbackQuery();
		await ctx.editMessageText(Registration.welcome(), { reply_markup: specialtiesKeyboard() });
	}

	@Callback(/^reg:back:course:(.+)$/)
	async backToCourses(ctx: Context): Promise<void> {
		await ctx.answerCallbackQuery();
		const code = ctx.callbackQuery?.data?.split(':')[3] ?? '';
		const specialty = findSpecialty(code);
		if (!specialty) return;
		await ctx.editMessageText(Registration.chooseCourse(specialty.title), {
			reply_markup: coursesKeyboard(specialty),
		});
	}

	@Callback(/^reg:spec:(.+)$/)
	async chooseCourse(ctx: Context): Promise<void> {
		await ctx.answerCallbackQuery();
		const code = ctx.callbackQuery?.data?.split(':')[2] ?? '';
		const specialty = findSpecialty(code);
		if (!specialty) return;
		await ctx.editMessageText(Registration.chooseCourse(specialty.title), {
			reply_markup: coursesKeyboard(specialty),
		});
	}

	@Callback(/^reg:course:(.+):(\d)$/)
	async chooseGroup(ctx: Context): Promise<void> {
		await ctx.answerCallbackQuery();
		const [, , code, courseRaw] = ctx.callbackQuery?.data?.split(':') ?? [];
		const specialty = findSpecialty(code ?? '');
		const course = Number(courseRaw);
		if (!specialty || !Number.isFinite(course)) return;
		await ctx.editMessageText(Registration.chooseGroup(specialty.title, course), {
			reply_markup: groupsKeyboard(specialty, course),
		});
	}

	@Callback(/^reg:group:(.+)$/)
	async saveGroup(ctx: Context): Promise<void> {
		await ctx.answerCallbackQuery();
		const telegramId = ctx.from?.id;
		const groupApiId = ctx.callbackQuery?.data?.split(':')[2];
		if (!telegramId || !groupApiId) return;
		const title = GroupTitleById[groupApiId];
		if (!title) {
			await ctx.editMessageText(Registration.unknownGroup());
			return;
		}
		const existing = await this.users.find(telegramId);
		await this.users.getOrCreate(telegramId);
		await this.users.setGroup(telegramId, groupApiId);
		await publish(Queues.requests, { groupApiId });
		await ctx.editMessageText(
			existing?.groupApiId ? Registration.changed(title) : Registration.registered(title),
		);
		await ctx.reply(Common.help(), { reply_markup: mainKeyboard() });
	}

	@Callback('set:group')
	async changeGroup(ctx: Context): Promise<void> {
		await ctx.answerCallbackQuery();
		await ctx.reply(Registration.welcome(), { reply_markup: specialtiesKeyboard() });
	}
}
