import { eq, sql } from 'drizzle-orm';
import { singleton } from 'tsyringe';
import {
	annotateLessons,
	countLessons,
	createLogger,
	fetchGroupWeek,
	fetchTeacherWeek,
	getDb,
	getWeekStart,
	md5,
	publish,
	Queues,
	schema,
	TeacherList,
	toErrorMeta,
	type Lesson,
	type WeekSchedule,
} from '@college/shared';
import { ParserService } from './parser.service';

const log = createLogger('preschedule');

/** Сколько преподавателей опрашиваем параллельно, чтобы не положить API колледжа. */
const CONCURRENCY = 5;

@singleton()
export class PreScheduleService {
	private readonly db = getDb();

	constructor(private readonly parser: ParserService) {}

	/**
	 * Собирает предрасписание следующей недели из расписаний преподавателей.
	 * Группы, у которых расписание уже опубликовано, пропускаются — это не предрасписание.
	 */
	async sync(): Promise<void> {
		const weekStart = getWeekStart(new Date(), 1);
		const groups = await this.parser.activeGroups();
		if (groups.length === 0) return;

		const { byGroup: lessonsByGroup, all } = await this.collectTeacherLessons(weekStart);
		log.info('Собраны данные преподавателей', {
			weekStart: weekStart.toISOString(),
			groups: lessonsByGroup.size,
		});

		for (const groupApiId of groups) {
			const lessons = lessonsByGroup.get(groupApiId);
			if (!lessons?.length) continue;
			if (await this.isPublished(groupApiId, weekStart)) continue;
			await this.store(groupApiId, weekStart, annotateLessons(lessons, groupApiId, all));
		}
	}

	private async isPublished(groupApiId: string, weekStart: Date): Promise<boolean> {
		try {
			const published = await fetchGroupWeek(groupApiId, weekStart);
			return countLessons(published) > 0;
		} catch (error) {
			log.warn('Не удалось проверить публикацию расписания', {
				groupApiId,
				...toErrorMeta(error),
			});
			return false;
		}
	}

	private async store(groupApiId: string, weekStart: Date, lessons: Lesson[]): Promise<void> {
		const week = this.buildWeek(weekStart, lessons);
		const hash = md5(week.days);
		const [cached] = await this.db
			.select()
			.from(schema.preScheduleCache)
			.where(eq(schema.preScheduleCache.groupApiId, groupApiId));
		if (cached?.rawDataHash === hash) return;

		await this.db
			.insert(schema.preScheduleCache)
			.values({
				groupApiId,
				rawDataHash: hash,
				parsedData: week,
				teacherSourceData: lessons,
			})
			.onConflictDoUpdate({
				target: schema.preScheduleCache.groupApiId,
				set: {
					rawDataHash: hash,
					parsedData: week,
					teacherSourceData: lessons,
					lastUpdated: sql`now()`,
				},
			});

		log.info('Предрасписание обновлено', { groupApiId });
		await publish(Queues.preschedule, {
			groupApiId,
			weekStart: week.weekStart,
			kind: 'preschedule',
		});
	}

	private buildWeek(weekStart: Date, lessons: Lesson[]): WeekSchedule {
		const byDay = new Map<string, Lesson[]>();
		for (const lesson of lessons) {
			const date = new Date(lesson.start).toISOString().slice(0, 10);
			const bucket = byDay.get(date) ?? [];
			bucket.push(lesson);
			byDay.set(date, bucket);
		}
		const days = [...byDay.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([, dayLessons]) => ({
				date: dayLessons[0]!.start,
				lessons: [...dayLessons].sort(
					(a, b) => a.index - b.index || a.start.localeCompare(b.start),
				),
			}));
		return { weekStart: weekStart.toISOString(), days };
	}

	/** Уроки всех преподавателей за неделю, сгруппированные по группам. */
	private async collectTeacherLessons(
		weekStart: Date,
	): Promise<{ byGroup: Map<string, Lesson[]>; all: Lesson[] }> {
		const result = new Map<string, Lesson[]>();
		const all: Lesson[] = [];
		const ids = TeacherList.map(([, id]) => id);

		for (let offset = 0; offset < ids.length; offset += CONCURRENCY) {
			const chunk = ids.slice(offset, offset + CONCURRENCY);
			const weeks = await Promise.all(
				chunk.map(async (teacherId) => {
					try {
						return await fetchTeacherWeek(teacherId, weekStart);
					} catch (error) {
						log.warn('Расписание преподавателя недоступно', {
							teacherId,
							...toErrorMeta(error),
						});
						return null;
					}
				}),
			);
			for (const week of weeks) {
				if (!week) continue;
				for (const day of week.days) {
					for (const lesson of day.lessons) {
						if (!lesson.groupId) continue;
						all.push(lesson);
						const bucket = result.get(lesson.groupId) ?? [];
						bucket.push(lesson);
						result.set(lesson.groupId, bucket);
					}
				}
			}
		}

		return { byGroup: result, all };
	}
}
