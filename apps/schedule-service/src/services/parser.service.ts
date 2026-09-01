import { eq, isNotNull, sql } from 'drizzle-orm';
import { singleton } from 'tsyringe';
import {
	createLogger,
	diffWeeks,
	fetchGroupWeek,
	getDb,
	getWeekStart,
	md5,
	publish,
	Queues,
	schema,
	toErrorMeta,
	type WeekSchedule,
} from '@college/shared';
import { SharedLessonsService } from './shared-lessons.service';

const log = createLogger('parser');

@singleton()
export class ParserService {
	private readonly db = getDb();

	constructor(private readonly sharedLessons: SharedLessonsService) {}

	/** Группы, за которыми есть смысл следить: у них есть подписчики. */
	async activeGroups(): Promise<string[]> {
		const rows = await this.db
			.selectDistinct({ groupApiId: schema.users.groupApiId })
			.from(schema.users)
			.where(isNotNull(schema.users.groupApiId));
		return rows.map((row) => row.groupApiId).filter((id): id is string => Boolean(id));
	}

	/**
	 * Обновляет кэш расписания группы и, если содержимое изменилось,
	 * шлёт уведомление в `bot_notifications`. Смена недели уведомлением не считается.
	 */
	async syncGroup(groupApiId: string, weekStart = getWeekStart()): Promise<boolean> {
		let week: WeekSchedule;
		try {
			week = await fetchGroupWeek(groupApiId, weekStart);
		} catch (error) {
			log.error('Не удалось обновить расписание, остаётся кэш', {
				groupApiId,
				...toErrorMeta(error),
			});
			return false;
		}

		const hash = md5(week.days);
		const [cached] = await this.db
			.select()
			.from(schema.scheduleCache)
			.where(eq(schema.scheduleCache.groupApiId, groupApiId));

		if (cached?.rawDataHash === hash) return false;

		const annotated = await this.sharedLessons.annotate(week, groupApiId);

		await this.db
			.insert(schema.scheduleCache)
			.values({ groupApiId, rawDataHash: hash, parsedData: annotated })
			.onConflictDoUpdate({
				target: schema.scheduleCache.groupApiId,
				set: { rawDataHash: hash, parsedData: annotated, lastUpdated: sql`now()` },
			});

		const isNewWeek = cached?.parsedData.weekStart !== week.weekStart;
		if (!cached || isNewWeek) return false;

		const changes = diffWeeks(cached.parsedData, annotated);
		if (changes.length === 0) return false;

		log.info('Расписание изменилось', { groupApiId, changes: changes.length });
		await publish(Queues.notifications, {
			groupApiId,
			weekStart: week.weekStart,
			kind: 'schedule',
			changes,
		});
		return true;
	}

	async syncAll(): Promise<void> {
		const groups = await this.activeGroups();
		log.info('Обновление расписаний', { groups: groups.length });
		for (const groupApiId of groups) {
			await this.syncGroup(groupApiId);
		}
	}
}
