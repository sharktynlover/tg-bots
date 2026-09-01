/** Живая проверка: ищет совмещённые/параллельные пары в реальных расписаниях групп. */
import { container } from 'tsyringe';
import 'reflect-metadata';
import { fetchGroupWeek, getWeekStart, Specialties } from '../packages/shared/src';
import { SharedLessonsService } from '../apps/schedule-service/src/services/shared-lessons.service';

const service = container.resolve(SharedLessonsService);
const groups = Object.values(Specialties).flatMap((spec) => Object.values(spec.groups));

for (const weekOffset of [-1, 0]) {
	const weekStart = getWeekStart(new Date(), weekOffset);
	for (const groupApiId of groups.slice(0, 6)) {
		const week = await fetchGroupWeek(groupApiId, weekStart);
		const annotated = await service.annotate(week, groupApiId);
		for (const day of annotated.days) {
			for (const lesson of day.lessons) {
				if (!lesson.sharedWith?.length) continue;
				console.log(
					groupApiId,
					lesson.start,
					lesson.title,
					'->',
					lesson.sharedWith.map((item) => `${item.groupTitle}:${item.mode}`).join(' '),
				);
			}
		}
	}
}
