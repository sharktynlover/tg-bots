import type { Context } from 'grammy';
import { Callback, Command, Controller, Hears } from '../core/decorators';
import { floorPlanKeyboard } from '../keyboards/navigation.keyboard';
import { MainButtons } from '../keyboards/main.keyboard';
import { Navigation } from '../messages';
import { NavigationService } from '../services/navigation.service';
import { StateService } from '../services/state.service';

@Controller()
export class NavigationController {
	constructor(
		private readonly navigation: NavigationService,
		private readonly state: StateService,
	) {}

	@Command('cabinet')
	async cabinet(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		const argument = ctx.match?.toString().trim() ?? '';
		if (!argument) {
			await this.state.set(telegramId, 'cabinet');
			await ctx.reply(Navigation.ask());
			return;
		}
		await this.answer(ctx, argument);
	}

	@Hears(MainButtons.cabinet)
	async ask(ctx: Context): Promise<void> {
		const telegramId = ctx.from?.id;
		if (!telegramId) return;
		await this.state.set(telegramId, 'cabinet');
		await ctx.reply(Navigation.ask());
	}

	@Callback(/^nav:plan:(.+)$/)
	async plan(ctx: Context): Promise<void> {
		await ctx.answerCallbackQuery();
		const cabinet = ctx.callbackQuery?.data?.split(':')[2] ?? '';
		const location = this.navigation.locate(cabinet);
		if (!location) return;
		await ctx.reply(Navigation.floorPlan(location, this.navigation.floorPlan(location)));
	}

	/** Ответ на номер кабинета — вызывается и из команды, и из пошагового сценария. */
	async answer(ctx: Context, input: string): Promise<void> {
		if (this.navigation.isSpecial(input.trim())) {
			await ctx.reply(Navigation.special(input.trim()));
			return;
		}
		const location = this.navigation.locate(input);
		if (!location) {
			await ctx.reply(Navigation.notFound(input));
			return;
		}
		await ctx.reply(Navigation.location(location), {
			reply_markup: floorPlanKeyboard(location.name),
		});
	}
}
