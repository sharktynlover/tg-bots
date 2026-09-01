import { singleton } from 'tsyringe';
import {
	createLogger,
	fetchGroupWeek,
	getWeekStart,
	Specialties,
	toErrorMeta,
	type Lesson,
} from '@college/shared';

const log = createLogger('rov');

/** Пара «Разговоры о важном» в разных группах записана по-разному. */
const ROV_PATTERN = /разговор[а-яё]*\s+о\s+важн/i;
const CONCURRENCY = 6;

export interface RovEntry {
	groupTitle: string;
	groupApiId: string;
	lessons: Lesson[];
	/** Расписание группы не удалось получить. */
	failed?: boolean;
}

@singleton()
export class RovService {
	/** Проверяет все группы колледжа на наличие «Разговоров о важном» в неделе. */
	async scan(weekOffset = 0): Promise<{ weekStart: Date; entries: RovEntry[] }> {
		const weekStart = getWeekStart(new Date(), weekOffset);
		const groups = Object.values(Specialties).flatMap((specialty) =>
			Object.entries(specialty.groups).map(([groupTitle, groupApiId]) => ({
				groupTitle,
				groupApiId,
			})),
		);

		const entries: RovEntry[] = [];
		for (let index = 0; index < groups.length; index += CONCURRENCY) {
			const chunk = groups.slice(index, index + CONCURRENCY);
			const results = await Promise.all(
				chunk.map(async ({ groupTitle, groupApiId }): Promise<RovEntry> => {
					try {
						const week = await fetchGroupWeek(groupApiId, weekStart);
						const lessons = week.days
							.flatMap((day) => day.lessons)
							.filter((lesson) => ROV_PATTERN.test(lesson.title))
							.sort((a, b) => a.start.localeCompare(b.start));
						return { groupTitle, groupApiId, lessons };
					} catch (error) {
						log.error('Группа недоступна', { groupApiId, ...toErrorMeta(error) });
						return { groupTitle, groupApiId, lessons: [], failed: true };
					}
				}),
			);
			entries.push(...results);
		}

		return { weekStart, entries };
	}
}
