import {
	formatDayTitle,
	formatDuration,
	formatTime,
	getWeekdayIndex,
	WEEKDAYS,
	type Lesson,
	type ScheduleChange,
	type SharedGroup,
	type ScheduleDay,
	type ScheduleFormat,
} from '@college/shared';

/** Больше не влезает в одно читаемое сообщение. */
const MAX_CHANGES = 12;

export function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function subgroupSuffix(lesson: Lesson): string {
	return lesson.subgroup ? ` (${lesson.subgroup} п/г)` : '';
}

/** «🤝 Совмещённая с Ис-232» / «↔️ Параллельно с Ис-232». */
function sharedLines(lesson: Lesson): string[] {
	const shared = lesson.sharedWith ?? [];
	if (shared.length === 0) return [];
	const combined = shared.filter((item) => item.mode === 'combined');
	const parallel = shared.filter((item) => item.mode === 'parallel');
	const lines: string[] = [];
	if (combined.length > 0) {
		lines.push(
			`🤝 Совмещённая с ${escapeHtml(combined.map((item) => item.groupTitle).join(', '))}`,
		);
	}
	if (parallel.length > 0) {
		lines.push(
			`↔️ Параллельно с ${escapeHtml(parallel.map((item) => item.groupTitle).join(', '))}`,
		);
	}
	return lines;
}

function sharedShort(lesson: Lesson): string {
	const shared = lesson.sharedWith ?? [];
	if (shared.length === 0) return '';
	const titles = (mode: SharedGroup['mode']): string =>
		escapeHtml(
			shared
				.filter((item) => item.mode === mode)
				.map((item) => item.groupTitle)
				.join(', '),
		);
	const combined = titles('combined');
	const parallel = titles('parallel');
	return `${combined ? ` 🤝 ${combined}` : ''}${parallel ? ` ↔️ ${parallel}` : ''}`;
}

function lessonDetailed(lesson: Lesson): string {
	const parts = [
		`<b>${formatTime(lesson.start)}–${formatTime(lesson.end)}</b> ${escapeHtml(lesson.title)}${subgroupSuffix(lesson)}`,
	];
	if (lesson.teacherName) parts.push(`👤 ${escapeHtml(lesson.teacherName)}`);
	if (lesson.classroomName) parts.push(`🚪 ${escapeHtml(lesson.classroomName)}`);
	parts.push(...sharedLines(lesson));
	return parts.join('\n');
}

function lessonCompact(lesson: Lesson): string {
	const room = lesson.classroomName ? ` (${escapeHtml(lesson.classroomName)})` : '';
	return `${formatTime(lesson.start)} ${escapeHtml(lesson.title)}${room}${subgroupSuffix(lesson)}${sharedShort(lesson)}`;
}

/** «Понедельник, 3 пара» — день недели и номер пары. */
function slot(lesson: Lesson): string {
	const weekday = WEEKDAYS[getWeekdayIndex(new Date(lesson.start))];
	return `${weekday}, ${lesson.index} пара`;
}

function room(lesson: Lesson): string {
	return lesson.classroomName ? `, каб. ${escapeHtml(lesson.classroomName)}` : '';
}

function changeLine(change: ScheduleChange): string {
	switch (change.kind) {
		case 'added':
			return `➕ Добавлена: ${escapeHtml(change.after.title)}${subgroupSuffix(change.after)} — ${slot(change.after)}${room(change.after)}`;
		case 'cancelled':
			return `❌ Отменена: ${escapeHtml(change.before.title)}${subgroupSuffix(change.before)} — ${slot(change.before)}`;
		case 'moved':
			return `🔁 Перенесена: ${escapeHtml(change.after.title)}${subgroupSuffix(change.after)} — было ${slot(change.before)}, стало ${slot(change.after)}${room(change.after)}`;
		case 'changed':
			return changedLine(change.before, change.after);
	}
}

/** Тот же слот, но поменялся предмет, кабинет или преподаватель. */
function changedLine(before: Lesson, after: Lesson): string {
	const details: string[] = [];
	if (before.title !== after.title) {
		details.push(`вместо «${escapeHtml(before.title)}»`);
	}
	if (before.classroomName !== after.classroomName) {
		details.push(
			`кабинет ${escapeHtml(before.classroomName ?? '—')} → ${escapeHtml(after.classroomName ?? '—')}`,
		);
	}
	if (before.teacherName !== after.teacherName) {
		details.push(
			`преподаватель ${escapeHtml(before.teacherName ?? '—')} → ${escapeHtml(after.teacherName ?? '—')}`,
		);
	}
	const suffix = details.length > 0 ? ` (${details.join('; ')})` : '';
	return `✏️ Изменена: ${escapeHtml(after.title)}${subgroupSuffix(after)} — ${slot(after)}${suffix}`;
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

	changed: (group: string, changes: ScheduleChange[] = []) => {
		const header = `🔄 <b>Расписание группы ${escapeHtml(group)} изменилось</b>`;
		if (changes.length === 0) return `${header}\n\nЗагляни: /schedule`;
		const shown = changes.slice(0, MAX_CHANGES).map(changeLine);
		const rest =
			changes.length > MAX_CHANGES ? [`…и ещё ${changes.length - MAX_CHANGES} изменений`] : [];
		return [header, '', ...shown, ...rest, '', 'Полное расписание: /schedule'].join('\n');
	},

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
