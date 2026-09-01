import { GroupTitleById } from '../config/groups';
import type { Lesson, SharedGroup } from '../types';

/** Пара одного преподавателя в один момент времени — ключ для поиска совмещений. */
function slotKey(lesson: Lesson): string | null {
	return lesson.teacherId ? `${lesson.teacherId}|${lesson.start}` : null;
}

/**
 * Считает по общему пулу пар (обычно — расписания преподавателей), какие группы
 * занимаются вместе: тот же кабинет — `combined`, разные кабинеты — `parallel`.
 *
 * Возвращает соседей для каждой группы по ключу `teacherId|start`.
 */
export function buildSharedIndex(pool: Lesson[]): Map<string, Lesson[]> {
	const index = new Map<string, Lesson[]>();
	for (const lesson of pool) {
		const key = slotKey(lesson);
		if (!key || !lesson.groupId) continue;
		const bucket = index.get(key) ?? [];
		if (!bucket.some((item) => item.groupId === lesson.groupId)) bucket.push(lesson);
		index.set(key, bucket);
	}
	return index;
}

/** Соседние группы для конкретной пары (без самой группы). */
export function sharedGroupsFor(
	lesson: Lesson,
	groupApiId: string,
	index: Map<string, Lesson[]>,
): SharedGroup[] {
	const key = slotKey(lesson);
	if (!key) return [];
	return (index.get(key) ?? [])
		.filter((other) => other.groupId && other.groupId !== groupApiId)
		.map((other) => ({
			groupApiId: other.groupId!,
			groupTitle: other.groupTitle ?? GroupTitleById[other.groupId!] ?? other.groupId!,
			mode: other.classroomId === lesson.classroomId ? ('combined' as const) : ('parallel' as const),
		}));
}

/** Проставляет `sharedWith` у пар группы по общему пулу. */
export function annotateLessons(
	lessons: Lesson[],
	groupApiId: string,
	pool: Lesson[],
): Lesson[] {
	const index = buildSharedIndex(pool);
	return lessons.map((lesson) => {
		const shared = sharedGroupsFor(lesson, groupApiId, index);
		return shared.length > 0 ? { ...lesson, sharedWith: shared } : lesson;
	});
}
