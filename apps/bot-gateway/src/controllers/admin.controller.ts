import type { Context } from 'grammy';
import { AdminCommand, Controller } from '../core/decorators';
import { Admin } from '../messages';
import { BroadcastService } from '../services/broadcast.service';
import { UserService } from '../services/user.service';

@Controller()
export class AdminController {
	constructor(
		private readonly users: UserService,
		private readonly broadcast: BroadcastService,
	) {}

	@AdminCommand('admin')
	async panel(ctx: Context): Promise<void> {
		await ctx.reply(Admin.panel());
	}

	@AdminCommand('stats')
	async stats(ctx: Context): Promise<void> {
		const { users, groups, reminders } = await this.users.stats();
		await ctx.reply(Admin.stats(users, groups, reminders));
	}

	/** `/broadcast текст` или `/broadcast group is-231,is-232 текст`. */
	@AdminCommand('broadcast')
	async broadcastCommand(ctx: Context): Promise<void> {
		const adminId = ctx.from?.id;
		const argument = ctx.match?.toString().trim() ?? '';
		if (!adminId || !argument) {
			await ctx.reply(Admin.broadcastUsage());
			return;
		}

		const groupMatch = /^group\s+(\S+)\s+([\s\S]+)$/.exec(argument);
		const groupApiIds = groupMatch?.[1]
			?.split(',')
			.map((id) => id.trim())
			.filter(Boolean);
		const text = groupMatch?.[2] ?? argument;
		if (!text) {
			await ctx.reply(Admin.broadcastUsage());
			return;
		}

		await this.broadcast.enqueue({ text, groupApiIds, adminId });
		await ctx.reply(Admin.broadcastQueued(groupApiIds?.length ? groupApiIds.join(', ') : 'всем'));
	}
}
