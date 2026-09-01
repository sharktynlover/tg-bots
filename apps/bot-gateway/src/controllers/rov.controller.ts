import type { Context } from 'grammy';
import { AdminCommand, Controller, RestrictedCommand } from '../core/decorators';
import { Rov } from '../messages';
import { AccessService } from '../services/access.service';
import { RovService } from '../services/rov.service';

const WEEK_OFFSETS: Record<string, number> = { '': 0, next: 1, prev: -1 };

@Controller()
export class RovController {
	constructor(
		private readonly rov: RovService,
		private readonly access: AccessService,
	) {}

	/** `/rov`, `/rov next`, `/rov prev` — список групп с «Разговорами о важном». */
	@RestrictedCommand('rov')
	async report(ctx: Context): Promise<void> {
		const argument = ctx.match?.toString().trim().toLowerCase() ?? '';
		const weekOffset = WEEK_OFFSETS[argument];
		if (weekOffset === undefined) {
			await ctx.reply(Rov.usage());
			return;
		}

		await ctx.reply(Rov.scanning());
		const { weekStart, entries } = await this.rov.scan(weekOffset);
		for (const chunk of Rov.report(weekStart, entries)) {
			await ctx.reply(chunk);
		}
	}

	/** `/rov_access [add|del] <telegram id>` — управление доступом к `/rov`. */
	@AdminCommand('rov_access')
	async manageAccess(ctx: Context): Promise<void> {
		const adminId = ctx.from?.id;
		if (!adminId) return;
		const argument = ctx.match?.toString().trim() ?? '';
		if (!argument) {
			await ctx.reply(Rov.accessList(await this.access.list('rov')));
			return;
		}

		const parsed = /^(add|del)\s+(\d{1,15})$/.exec(argument);
		if (!parsed) {
			await ctx.reply(Rov.accessUsage());
			return;
		}

		const telegramId = Number(parsed[2]);
		if (parsed[1] === 'add') {
			await this.access.grant('rov', telegramId, adminId);
			await ctx.reply(Rov.granted(telegramId));
			return;
		}
		await this.access.revoke('rov', telegramId);
		await ctx.reply(Rov.revoked(telegramId));
	}
}
