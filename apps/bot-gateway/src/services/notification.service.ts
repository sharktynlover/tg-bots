import { singleton } from 'tsyringe';
import {
	createLogger,
	GroupTitleById,
	toErrorMeta,
	type NotificationEvent,
	type ReminderEvent,
} from '@college/shared';
import { getBot } from '../core/bot';
import { Schedule } from '../messages';
import { UserService } from './user.service';

const log = createLogger('notifications');

const MESSAGES_PER_SECOND = 30;

@singleton()
export class NotificationService {
	constructor(private readonly users: UserService) {}

	/** Изменилось расписание или появилось предрасписание группы. */
	async onScheduleEvent(event: NotificationEvent): Promise<void> {
		const title = GroupTitleById[event.groupApiId] ?? event.groupApiId;
		const text =
			event.kind === 'preschedule' ? Schedule.prescheduleReady(title) : Schedule.changed(title);
		const recipients = await this.users.findByGroup(event.groupApiId);
		await this.send(
			recipients.map((user) => user.telegramId),
			text,
		);
	}

	/** Напоминание получают только те, у кого выбран этот порог. */
	async onReminder(event: ReminderEvent): Promise<void> {
		const recipients = await this.users.findForReminder(event.groupApiId, event.offset);
		await this.send(
			recipients.map((user) => user.telegramId),
			Schedule.reminder(event.lesson, event.offset),
		);
	}

	private async send(telegramIds: number[], text: string): Promise<void> {
		const bot = getBot();
		for (const [index, telegramId] of telegramIds.entries()) {
			if (index > 0 && index % MESSAGES_PER_SECOND === 0) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			await bot.api.sendMessage(telegramId, text).catch((error) => {
				log.warn('Уведомление не доставлено', { telegramId, ...toErrorMeta(error) });
			});
		}
	}
}
