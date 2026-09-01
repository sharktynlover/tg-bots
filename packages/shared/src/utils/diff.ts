import type { Lesson, ScheduleChange, WeekSchedule } from '../types';

function allLessons(week: WeekSchedule): Lesson[] {
	return week.days.flatMap((day) => day.lessons);
}

function sameSlot(a: Lesson, b: Lesson): boolean {
	return a.start === b.start && a.subgroup === b.subgroup;
}

function sameContent(a: Lesson, b: Lesson): boolean {
	return (
		a.title === b.title &&
		a.start === b.start &&
		a.end === b.end &&
		a.classroomId === b.classroomId &&
		a.classroomName === b.classroomName &&
		a.teacherId === b.teacherId &&
		a.teacherName === b.teacherName &&
		a.subgroup === b.subgroup
	);
}

/** «Та же пара, но в другое время» — предмет и подгруппа совпадают. */
function sameLessonMoved(a: Lesson, b: Lesson): boolean {
	return a.title === b.title && a.subgroup === b.subgroup && a.start !== b.start;
}

function describe(before: Lesson, after: Lesson): ScheduleChange | null {
	if (sameContent(before, after)) return null;
	if (before.start !== after.start || before.end !== after.end) {
		return { kind: 'moved', before, after };
	}
	return { kind: 'changed', before, after };
}

/**
 * Сравнивает две недели и возвращает конкретные изменения: отмены, добавления,
 * переносы и правки (кабинет, преподаватель, предмет в том же слоте).
 *
 * Пары сопоставляются по id, затем по «предмет+подгруппа» (перенос),
 * затем по слоту времени (замена); остальное — отмена или добавление.
 */
export function diffWeeks(before: WeekSchedule, after: WeekSchedule): ScheduleChange[] {
	const old = allLessons(before);
	const fresh = allLessons(after);
	const takenOld = new Set<number>();
	const takenNew = new Set<number>();
	const changes: ScheduleChange[] = [];

	const match = (predicate: (a: Lesson, b: Lesson) => boolean): void => {
		old.forEach((oldLesson, oldIndex) => {
			if (takenOld.has(oldIndex)) return;
			const newIndex = fresh.findIndex(
				(newLesson, index) => !takenNew.has(index) && predicate(oldLesson, newLesson),
			);
			if (newIndex === -1) return;
			takenOld.add(oldIndex);
			takenNew.add(newIndex);
			const change = describe(oldLesson, fresh[newIndex]!);
			if (change) changes.push(change);
		});
	};

	match((a, b) => a.id === b.id);
	match(sameLessonMoved);
	match(sameSlot);

	old.forEach((lesson, index) => {
		if (!takenOld.has(index)) changes.push({ kind: 'cancelled', before: lesson });
	});
	fresh.forEach((lesson, index) => {
		if (!takenNew.has(index)) changes.push({ kind: 'added', after: lesson });
	});

	return changes.sort((a, b) => {
		const left = a.after?.start ?? a.before?.start ?? '';
		const right = b.after?.start ?? b.before?.start ?? '';
		return left.localeCompare(right);
	});
}
