import { injectable } from 'tsyringe';
import { Callback, Command, Middleware } from '@/decorators';
import { MESSAGES } from '@/messages/ru';
import { ReferralService } from '@/services/referral.service';
import type { BotContext } from '@/types/context';
import { render } from '@/utils/template';

@injectable()
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Command('invite')
  @Callback('referral:menu')
  @Middleware('profile')
  async menu(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const me = await ctx.api.getMe();
    const [link, stats] = await Promise.all([
      this.referralService.link(user, me.username),
      this.referralService.stats(user.id),
    ]);

    await ctx.reply(
      render(MESSAGES.REFERRAL.MENU, {
        link,
        count: stats.total,
        superlikes: stats.superlikes,
        boosts: stats.boosts,
      }),
      { link_preview_options: { is_disabled: true } },
    );
  }
}
