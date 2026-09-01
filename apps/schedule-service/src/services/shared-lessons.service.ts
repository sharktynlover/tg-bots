import { singleton } from 'tsyringe';
import {
	annotateLessons,
	createLogger,
	fetchTeacherWeek,
	toErrorMeta,
	type Lesson,
	type WeekSchedule,
} from '@college/shared';

const log = createLogger('shared-lessons');

const TEACHER_CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
	lessons: Lesson[];
	expiresAt: number;
}

/**
 * Помечает пары, которые преподаватель ведёт сразу у нескольких групп:
 * тот же кабинет — совмещённая, разные кабинеты — параллельно.
 *
 * Источник истины — расписание преподавателя: в нём видны все его группы.
 */
@singleton()
export class SharedLessonsService {
	private readonly cache = new Map<string, CacheEntry>();

	async annotate(week: WeekSchedule, groupApiId: string): Promise<WeekSchedule> {
		const teacherIds = new Set(
			week.days.flatMap((day) =>
				day.lessons.map((lesson) => lesson.teacherId).filter((id): id is string => Boolean(id)),
			),
		);

		const pool: Lesson[] = [];
		for (const teacherId of teacherIds) {
			pool.push(...(await this.teacherLessons(teacherId, week.weekStart)));
		}
		if (pool.length === 0) return week;

		return {
			weekStart: week.weekStart,
			days: week.days.map((day) => ({
				date: day.date,
				lessons: annotateLessons(day.lessons, groupApiId, pool),
			})),
		};
	}

	private async teacherLessons(teacherId: string, weekStart: string): Promise<Lesson[]> {
		const key = `${teacherId}:${weekStart}`;
		const cached = this.cache.get(key);
		if (cached && cached.expiresAt > Date.now()) return cached.lessons;

		let lessons: Lesson[] = [];
		try {
			const week = await fetchTeacherWeek(teacherId, new Date(weekStart));
			lessons = week.days.flatMap((day) => day.lessons);
		} catch (error) {
			log.warn('Не удалось получить расписание преподавателя', {
				teacherId,
				...toErrorMeta(error),
			});
		}
		this.cache.set(key, { lessons, expiresAt: Date.now() + TEACHER_CACHE_TTL_MS });
		return lessons;
	}
}
