/** Проверка diff-а расписания и пометок совмещённых пар на синтетических данных. */
import { annotateLessons, diffWeeks, type Lesson, type WeekSchedule } from '../packages/shared/src';
import { Schedule } from '../apps/bot-gateway/src/messages';

function lesson(partial: Partial<Lesson> & { id: number; start: string }): Lesson {
	return {
		title: 'Математика',
		end: partial.start,
		index: 1,
		subgroup: null,
		type: null,
		teacherId: 'ivanov-ii',
		teacherName: 'Иванов И.И.',
		groupId: 'is-231',
		groupTitle: 'Ис-231',
		classroomId: 100,
		classroomName: '101',
		...partial,
	};
}

const week = (lessons: Lesson[]): WeekSchedule => ({
	weekStart: '2026-08-30T19:00:00.000Z',
	days: [{ date: '2026-08-31T19:00:00.000Z', lessons }],
});

const before = week([
	lesson({ id: 1, start: '2026-09-01T03:30:00.000Z', title: 'Математика', index: 1 }),
	lesson({ id: 2, start: '2026-09-01T05:20:00.000Z', title: 'Физика', index: 2 }),
	lesson({ id: 3, start: '2026-09-01T07:10:00.000Z', title: 'История', index: 3 }),
]);

const after = week([
	lesson({
		id: 1,
		start: '2026-09-01T03:30:00.000Z',
		title: 'Математика',
		index: 1,
		classroomName: '365',
	}),
	lesson({ id: 2, start: '2026-09-01T09:00:00.000Z', title: 'Физика', index: 4 }),
	lesson({ id: 4, start: '2026-09-01T07:10:00.000Z', title: 'Информатика', index: 3 }),
]);

const changes = diffWeeks(before, after);
console.log(Schedule.changed('Ис-231', changes));
console.log('---');

const own = lesson({ id: 10, start: '2026-09-01T03:30:00.000Z', title: 'Физкультура' });
const pool: Lesson[] = [
	own,
	lesson({
		id: 11,
		start: '2026-09-01T03:30:00.000Z',
		title: 'Физкультура',
		groupId: 'is-232',
		groupTitle: 'Ис-232',
	}),
	lesson({
		id: 12,
		start: '2026-09-01T03:30:00.000Z',
		title: 'Физкультура',
		groupId: 'is-233',
		groupTitle: 'Ис-233',
		classroomId: 71,
		classroomName: 'Спортзал',
	}),
];

const annotated = annotateLessons([own], 'is-231', pool);
console.log(
	Schedule.day({ date: '2026-09-01T03:30:00.000Z', lessons: annotated }, 'detailed'),
	'\n',
	Schedule.day({ date: '2026-09-01T03:30:00.000Z', lessons: annotated }, 'compact'),
);
