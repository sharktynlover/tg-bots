import { injectable } from 'tsyringe';
import { Command, Hears } from '@/decorators';
import { mainKeyboard } from '@/keyboards/main.keyboard';
import { BUTTONS, MESSAGES } from '@/messages/ru';
import { ReferralService } from '@/services/referral.service';
import type { BotContext } from '@/types/context';
import { render } from '@/utils/template';

const HELP_TEXT = [
  'ℹ️ Как пользоваться ботом:',
  '',
  '🔍 Смотреть анкеты — лента подходящих анкет: ❤️ лайк, ⭐ суперлайк, ⏭️ скип, 💬 анонимный вопрос, ⚠️ жалоба.',
  '❤️ Кто меня лайкнул — очередь входящих лайков, суперлайки показываются первыми.',
  '👤 Профиль — просмотр, редактирование, скрытие и удаление анкеты, бусты и приглашения друзей.',
  '',
  'Команды: /start, /help, /profile, /feed, /likes',
].join('\n');

@injectable()
export class StartController {
  constructor(private readonly referralService: ReferralService) {}

  @Command('start')
  async start(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;

    const payload = ctx.match ? String(ctx.match) : undefined;
    const referralCode = ReferralService.parseStartPayload(payload);
    if (referralCode) {
      const attached = await this.referralService.attachReferrer(user, referralCode);
      if (attached) await ctx.reply(MESSAGES.REFERRAL.JOINED);
    }

    await ctx.setSession({ step: 'idle' });
    const greeting = user.isProfileComplete
      ? render(MESSAGES.COMMON.WELCOME_BACK, { name: user.name ?? '' })
      : MESSAGES.COMMON.WELCOME;
    await ctx.reply(greeting, { reply_markup: mainKeyboard(user.isProfileComplete) });
  }

  @Command('help')
  @Hears(BUTTONS.MAIN.HELP)
  async help(ctx: BotContext): Promise<void> {
    await ctx.reply(HELP_TEXT, {
      reply_markup: mainKeyboard(ctx.user?.isProfileComplete ?? false),
    });
  }

  @Hears(BUTTONS.COMMON.CANCEL)
  async cancel(ctx: BotContext): Promise<void> {
    await ctx.setSession({ step: 'idle' });
    await ctx.reply(MESSAGES.COMMON.CANCELLED, {
      reply_markup: mainKeyboard(ctx.user?.isProfileComplete ?? false),
    });
  }
}
