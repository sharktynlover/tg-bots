import ical from 'ical-generator';
import { singleton } from 'tsyringe';
import { COLLEGE_TIMEZONE, type WeekSchedule } from '@college/shared';

@singleton()
export class ExportService {
	/** .ics с парами недели; всё время — в часовом поясе колледжа. */
	build(week: WeekSchedule, groupTitle: string): Buffer {
		const calendar = ical({ name: `Расписание ${groupTitle}`, timezone: COLLEGE_TIMEZONE });
		for (const day of week.days) {
			for (const lesson of day.lessons) {
				calendar.createEvent({
					start: new Date(lesson.start),
					end: new Date(lesson.end),
					summary: lesson.subgroup ? `${lesson.title} (${lesson.subgroup} п/г)` : lesson.title,
					location: lesson.classroomName ?? undefined,
					description: lesson.teacherName ?? undefined,
				});
			}
		}
		return Buffer.from(calendar.toString(), 'utf-8');
	}
}
