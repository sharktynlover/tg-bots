import { singleton } from 'tsyringe';
import {
	createLogger,
	minutesUntil,
	publish,
	Queues,
	REMINDER_OFFSETS,
	type WeekSchedule,
} from '@college/shared';
import { CacheService } from './cache.service';
import { ParserService } from './parser.service';

const log = createLogger('reminders');

@singleton()
export class ReminderService {
	constructor(
		private readonly parser: ParserService,
		private readonly cache: CacheService,
	) {}

	/**
	 * Запускается раз в минуту: находит пары, до начала которых осталось
	 * ровно 5, 10 или 15 минут, и публикует события в `bot_reminders`.
	 */
	async tick(now = new Date()): Promise<void> {
		const groups = await this.parser.activeGroups();
		for (const groupApiId of groups) {
			const week = await this.cache.getWeek(groupApiId);
			if (!week) continue;
			for (const { offset, lesson } of this.dueLessons(week, now)) {
				log.info('Напоминание', { groupApiId, offset, lesson: lesson.title });
				await publish(Queues.reminders, { groupApiId, offset, lesson });
			}
		}
	}

	private dueLessons(week: WeekSchedule, now: Date) {
		return week.days
			.flatMap((day) => day.lessons)
			.flatMap((lesson) => {
				const minutes = minutesUntil(lesson.start, now);
				const offset = REMINDER_OFFSETS.find((value) => value === minutes);
				return offset ? [{ offset, lesson }] : [];
			});
	}
}
