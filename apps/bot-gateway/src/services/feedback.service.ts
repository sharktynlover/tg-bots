import { singleton } from 'tsyringe';
import { createLogger, env, toErrorMeta } from '@college/shared';
import { getBot } from '../core/bot';
import { Feedback } from '../messages';

const log = createLogger('feedback');

const ID_PATTERN = /ID:\s*(\d+)/;

@singleton()
export class FeedbackService {
	async sendToAdmins(
		telegramId: number,
		username: string | undefined,
		text: string,
	): Promise<boolean> {
		const admins = env.adminIds;
		if (admins.length === 0) return false;
		const bot = getBot();
		const message = Feedback.toAdmin(telegramId, username, text);
		for (const adminId of admins) {
			await bot.api.sendMessage(adminId, message).catch((error) => {
				log.warn('Не доставлено администратору', { adminId, ...toErrorMeta(error) });
			});
		}
		return true;
	}

	/** Telegram id студента из пересланного администратору сообщения. */
	extractStudentId(text: string): number | null {
		const match = ID_PATTERN.exec(text);
		return match?.[1] ? Number(match[1]) : null;
	}

	async replyToStudent(studentId: number, text: string): Promise<boolean> {
		try {
			await getBot().api.sendMessage(studentId, Feedback.replyToUser(text));
			return true;
		} catch (error) {
			log.warn('Ответ не доставлен студенту', { studentId, ...toErrorMeta(error) });
			return false;
		}
	}
}
