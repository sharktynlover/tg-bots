import { injectable } from 'tsyringe';
import { Callback, Command, Middleware } from '@/decorators';
import { boostDurationKeyboard } from '@/keyboards/swipe.keyboard';
import { MESSAGES } from '@/messages/ru';
import { BoostService } from '@/services/boost.service';
import type { BotContext } from '@/types/context';
import { formatDateTime } from '@/utils/date.utils';
import { render } from '@/utils/template';

const ALLOWED_DURATIONS = [1, 6, 24];

@injectable()
export class BoostController {
  constructor(private readonly boostService: BoostService) {}

  @Command('boost')
  @Callback('boost:menu')
  @Middleware('profile')
  async menu(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const isActive = user.boostExpiresAt && user.boostExpiresAt > new Date();
    const status = isActive
      ? render(MESSAGES.BOOST.ACTIVE_UNTIL, { until: formatDateTime(user.boostExpiresAt as Date) })
      : MESSAGES.BOOST.NOT_ACTIVE;

    await ctx.reply(
      `${render(MESSAGES.BOOST.MENU, { superlikes: user.superlikesAvailable, status })}\n\n${
        MESSAGES.BOOST.CHOOSE_DURATION
      }`,
      { reply_markup: boostDurationKeyboard() },
    );
  }

  @Callback(/^boost:activate:(\d+)$/)
  @Middleware('profile')
  async activate(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const hours = Number(ctx.match?.[1]);
    if (!user || !ALLOWED_DURATIONS.includes(hours)) return;
    await ctx.answerCallbackQuery();

    const result = await this.boostService.activate(user.id, hours, 'superlikes');
    if (!result.ok) {
      await ctx.reply(MESSAGES.BOOST.NO_SUPERLIKES);
      return;
    }
    await ctx.reply(render(MESSAGES.BOOST.ACTIVATED, { until: formatDateTime(result.expiresAt) }));
  }
}
