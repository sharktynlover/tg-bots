import { eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';
import {
	createLogger,
	fetchGroupWeek,
	getDb,
	getWeekStart,
	schema,
	toErrorMeta,
	type Lesson,
	type WeekSchedule,
} from '@college/shared';

const log = createLogger('schedule-service');

@singleton()
export class ScheduleService {
	private readonly db = getDb();

	/** Расписание из кэша; если кэш пуст — разовый запрос в API. */
	async getWeek(groupApiId: string): Promise<WeekSchedule | null> {
		const [row] = await this.db
			.select()
			.from(schema.scheduleCache)
			.where(eq(schema.scheduleCache.groupApiId, groupApiId));
		if (row) return row.parsedData;
		try {
			return await fetchGroupWeek(groupApiId, getWeekStart());
		} catch (error) {
			log.error('Расписание недоступно', { groupApiId, ...toErrorMeta(error) });
			return null;
		}
	}

	async getPreSchedule(
		groupApiId: string,
	): Promise<{ week: WeekSchedule; teachers: string[] } | null> {
		const [row] = await this.db
			.select()
			.from(schema.preScheduleCache)
			.where(eq(schema.preScheduleCache.groupApiId, groupApiId));
		if (!row) return null;
		const teachers = [
			...new Set(row.teacherSourceData.map((lesson) => lesson.teacherName).filter(Boolean)),
		] as string[];
		return { week: row.parsedData, teachers: teachers.sort() };
	}

	/** Ближайшая пара, которая ещё не началась. */
	findNextLesson(week: WeekSchedule, now: Date = new Date()): Lesson | null {
		const upcoming = week.days
			.flatMap((day) => day.lessons)
			.filter((lesson) => new Date(lesson.start).getTime() > now.getTime())
			.sort((a, b) => a.start.localeCompare(b.start));
		return upcoming[0] ?? null;
	}
}
