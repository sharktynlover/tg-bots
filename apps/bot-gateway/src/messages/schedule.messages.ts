import {
	formatDayTitle,
	formatDuration,
	formatTime,
	type Lesson,
	type ScheduleDay,
	type ScheduleFormat,
} from '@college/shared';

export function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function subgroupSuffix(lesson: Lesson): string {
	return lesson.subgroup ? ` (${lesson.subgroup} п/г)` : '';
}

function lessonDetailed(lesson: Lesson): string {
	const parts = [
		`<b>${formatTime(lesson.start)}–${formatTime(lesson.end)}</b> ${escapeHtml(lesson.title)}${subgroupSuffix(lesson)}`,
	];
	if (lesson.teacherName) parts.push(`👤 ${escapeHtml(lesson.teacherName)}`);
	if (lesson.classroomName) parts.push(`🚪 ${escapeHtml(lesson.classroomName)}`);
	return parts.join('\n');
}

function lessonCompact(lesson: Lesson): string {
	const room = lesson.classroomName ? ` (${escapeHtml(lesson.classroomName)})` : '';
	return `${formatTime(lesson.start)} ${escapeHtml(lesson.title)}${room}${subgroupSuffix(lesson)}`;
}

export const Schedule = {
	day: (day: ScheduleDay, format: ScheduleFormat) => {
		const title = `📅 <b>${formatDayTitle(day.date)}</b>`;
		if (day.lessons.length === 0) return `${title}\n\nПар нет — отдыхай 😎`;
		const body =
			format === 'compact'
				? day.lessons.map(lessonCompact).join('\n')
				: day.lessons.map(lessonDetailed).join('\n\n');
		return `${title}\n\n${body}`;
	},

	emptyWeek: () => 'На эту неделю расписания пока нет 🤷',

	next: (lesson: Lesson, msUntil: number) =>
		[
			'🔮 <b>Следующая пара</b>',
			'',
			`${escapeHtml(lesson.title)}${subgroupSuffix(lesson)}`,
			`🕒 ${formatTime(lesson.start)}–${formatTime(lesson.end)}`,
			lesson.classroomName ? `🚪 ${escapeHtml(lesson.classroomName)}` : null,
			lesson.teacherName ? `👤 ${escapeHtml(lesson.teacherName)}` : null,
			'',
			`Осталось: ${formatDuration(msUntil)}`,
		]
			.filter((line) => line !== null)
			.join('\n'),

	nextTomorrow: (lesson: Lesson) =>
		[
			'На сегодня пары кончились 🎉',
			'',
			`Завтра первая — ${escapeHtml(lesson.title)} в ${formatTime(lesson.start)}`,
			lesson.classroomName ? `🚪 ${escapeHtml(lesson.classroomName)}` : null,
		]
			.filter((line) => line !== null)
			.join('\n'),

	noNext: () => 'Ближайших пар нет — выходной 🥳',

	changed: (group: string) =>
		`🔄 Расписание группы ${escapeHtml(group)} изменилось. Загляни: /schedule`,

	prescheduleReady: (group: string) =>
		`🧪 Появилось предрасписание для ${escapeHtml(group)} на следующую неделю: /preschedule`,

	prescheduleHeader: () =>
		'🧪 <b>Предрасписание</b>\nЭто черновик: он собран из расписания преподавателей и ещё может измениться.',

	prescheduleSource: (teachers: string[]) =>
		teachers.length === 0
			? ''
			: `\n\n<i>Основано на расписании преподавателей: ${escapeHtml(teachers.join(', '))}</i>`,

	prescheduleEmpty: () =>
		'Предрасписания на следующую неделю пока нет. Загляни в пятницу вечером 🙂',

	reminder: (lesson: Lesson, offset: number) =>
		[
			`⏰ Через ${offset} мин. начнётся пара!`,
			'',
			`${escapeHtml(lesson.title)}${subgroupSuffix(lesson)}`,
			lesson.classroomName ? `🚪 ${escapeHtml(lesson.classroomName)}` : null,
			lesson.teacherName ? `👤 ${escapeHtml(lesson.teacherName)}` : null,
		]
			.filter((line) => line !== null)
			.join('\n'),
};
