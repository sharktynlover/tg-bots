/**
 * Скан расписаний всех групп за несколько недель: ищет преподавателей,
 * кабинеты и группы, которых нет в конфигах.
 */
import { Specialties } from '../packages/shared/src/config/groups';
import { Teachers } from '../packages/shared/src/config/teachers';
import { Classrooms } from '../packages/shared/src/config/classrooms';
import { fetchGroupWeek } from '../packages/shared/src/api/college';
import { getWeekStart } from '../packages/shared/src/utils/time';

const WEEK_OFFSETS = [-2, -1, 0, 1, 2];
const CONCURRENCY = 6;

const groupIds = Object.values(Specialties).flatMap((spec) => Object.values(spec.groups));
const knownTeacherIds = new Set(Object.values(Teachers));
const knownClassroomIds = new Set(Object.values(Classrooms));
const knownGroupIds = new Set(groupIds);

const foundTeachers = new Map<string, string>();
const foundClassrooms = new Map<number, string>();
const foundGroups = new Map<string, string>();
let lessons = 0;

const tasks = groupIds.flatMap((groupId) => WEEK_OFFSETS.map((offset) => ({ groupId, offset })));

let cursor = 0;
async function worker(): Promise<void> {
	while (cursor < tasks.length) {
		const task = tasks[cursor++]!;
		try {
			const week = await fetchGroupWeek(task.groupId, getWeekStart(new Date(), task.offset));
			for (const day of week.days) {
				for (const lesson of day.lessons) {
					lessons += 1;
					if (lesson.teacherId && lesson.teacherName)
						foundTeachers.set(lesson.teacherId, lesson.teacherName);
					if (lesson.classroomId !== null && lesson.classroomName)
						foundClassrooms.set(lesson.classroomId, lesson.classroomName);
					if (lesson.groupId && lesson.groupTitle)
						foundGroups.set(lesson.groupId, lesson.groupTitle);
				}
			}
		} catch (error) {
			console.error('fail', task.groupId, task.offset, (error as Error).message);
		}
	}
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const newTeachers = [...foundTeachers].filter(([id]) => !knownTeacherIds.has(id));
const newClassrooms = [...foundClassrooms].filter(([id]) => !knownClassroomIds.has(id));
const newGroups = [...foundGroups].filter(([id]) => !knownGroupIds.has(id));

console.log(
	JSON.stringify(
		{
			lessons,
			teachers: foundTeachers.size,
			classrooms: foundClassrooms.size,
			newTeachers: Object.fromEntries(newTeachers.map(([id, name]) => [name, id])),
			newClassrooms: Object.fromEntries(newClassrooms.map(([id, name]) => [name, id])),
			newGroups: Object.fromEntries(newGroups.map(([id, title]) => [title, id])),
		},
		null,
		2,
	),
);
