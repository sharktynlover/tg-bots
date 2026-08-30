import { env, createLogger, toErrorMeta } from '@college/shared';
import { container } from 'tsyringe';
import type { Bot, Context } from 'grammy';
import { getHandlers } from './decorators';
import { Admin, Common } from '../messages';

const log = createLogger('router');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Controller = new (...args: any[]) => object;

type Handler = (ctx: Context) => Promise<unknown>;

function guard(name: string, adminOnly: boolean, run: Handler): Handler {
	return async (ctx) => {
		if (adminOnly && !env.adminIds.includes(ctx.from?.id ?? 0)) {
			await ctx.reply(Admin.denied());
			return;
		}
		try {
			await run(ctx);
		} catch (error) {
			log.error('Ошибка обработчика', { handler: name, ...toErrorMeta(error) });
			await ctx.reply(Common.error()).catch(() => undefined);
		}
	};
}

/**
 * Регистрирует методы контроллеров в grammy по метаданным декораторов.
 * Обработчики `@Text()` вешаются последними, чтобы не перехватывать команды и кнопки.
 */
export function registerControllers(bot: Bot, controllers: Controller[]): void {
	const deferred: (() => void)[] = [];

	for (const controller of controllers) {
		const instance = container.resolve(controller) as Record<string, Handler>;
		for (const meta of getHandlers(controller)) {
			const run = guard(
				`${controller.name}.${meta.method}`,
				meta.adminOnly,
				(ctx) => instance[meta.method]!.call(instance, ctx) as Promise<unknown>,
			);
			switch (meta.kind) {
				case 'command':
					bot.command(meta.trigger as string, run);
					break;
				case 'hears':
					bot.hears(meta.trigger, run);
					break;
				case 'callback':
					bot.callbackQuery(meta.trigger, run);
					break;
				case 'text':
					deferred.push(() => bot.on('message:text', run));
					break;
			}
			log.debug('Обработчик зарегистрирован', {
				controller: controller.name,
				method: meta.method,
				kind: meta.kind,
			});
		}
	}

	for (const register of deferred) register();
}
