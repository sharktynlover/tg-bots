import { singleton } from 'tsyringe';
import { createLogger, publish, Queues, toErrorMeta, type BroadcastEvent } from '@college/shared';
import { getBot } from '../core/bot';
import { Admin } from '../messages';
import { UserService } from '../services/user.service';

const log = createLogger('broadcast');

/** Лимит Telegram: не больше 30 сообщений в секунду на бота. */
const MESSAGES_PER_SECOND = 30;

@singleton()
export class BroadcastService {
	constructor(private readonly users: UserService) {}

	async enqueue(event: BroadcastEvent): Promise<void> {
		await publish(Queues.broadcasts, event);
	}

	/** Обработчик очереди `admin_broadcasts`. */
	async run(event: BroadcastEvent): Promise<void> {
		const recipients = event.groupApiIds?.length
			? await this.users.findByGroups(event.groupApiIds)
			: await this.users.findAll();
		const bot = getBot();
		let sent = 0;
		let failed = 0;

		for (const [index, user] of recipients.entries()) {
			if (index > 0 && index % MESSAGES_PER_SECOND === 0) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			try {
				await bot.api.sendMessage(user.telegramId, event.text);
				sent += 1;
			} catch (error) {
				failed += 1;
				log.warn('Сообщение рассылки не доставлено', {
					telegramId: user.telegramId,
					...toErrorMeta(error),
				});
			}
		}

		log.info('Рассылка завершена', { sent, failed });
		await bot.api
			.sendMessage(event.adminId, Admin.broadcastDone(sent, failed))
			.catch(() => undefined);
	}
}
