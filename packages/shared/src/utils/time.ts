import { COLLEGE_TIMEZONE } from '../env';

/** Смещение Asia/Yekaterinburg относительно UTC (постоянное, без перехода на летнее время). */
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAYS = [
	'Понедельник',
	'Вторник',
	'Среда',
	'Четверг',
	'Пятница',
	'Суббота',
	'Воскресенье',
] as const;

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

/** Начало недели (понедельник 00:00 по Екатеринбургу) в UTC. */
export function getWeekStart(from: Date = new Date(), weekOffset = 0): Date {
	const local = from.getTime() + TZ_OFFSET_MS;
	const midnight = Math.floor(local / DAY_MS) * DAY_MS;
	const weekday = (Math.floor(midnight / DAY_MS) + 3) % 7; // 1970-01-01 — четверг
	const monday = midnight - weekday * DAY_MS + weekOffset * 7 * DAY_MS;
	return new Date(monday - TZ_OFFSET_MS);
}

/** Начало дня (00:00 по Екатеринбургу) в UTC. */
export function getDayStart(from: Date = new Date(), dayOffset = 0): Date {
	const local = from.getTime() + TZ_OFFSET_MS;
	const midnight = Math.floor(local / DAY_MS) * DAY_MS + dayOffset * DAY_MS;
	return new Date(midnight - TZ_OFFSET_MS);
}

/** Индекс дня недели (0 — понедельник) по Екатеринбургу. */
export function getWeekdayIndex(date: Date): number {
	const local = date.getTime() + TZ_OFFSET_MS;
	return (Math.floor(local / DAY_MS) + 3) % 7;
}

export function isSameCollegeDay(a: Date, b: Date): boolean {
	return getDayStart(a).getTime() === getDayStart(b).getTime();
}

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
	timeZone: COLLEGE_TIMEZONE,
	hour: '2-digit',
	minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
	timeZone: COLLEGE_TIMEZONE,
	day: '2-digit',
	month: '2-digit',
});

/** «08:30» по Екатеринбургу. */
export function formatTime(date: Date | string): string {
	return timeFormatter.format(new Date(date));
}

/** «01.09» по Екатеринбургу. */
export function formatDate(date: Date | string): string {
	return dateFormatter.format(new Date(date));
}

/** «Понедельник, 01.09». */
export function formatDayTitle(date: Date | string): string {
	const value = new Date(date);
	return `${WEEKDAYS[getWeekdayIndex(value)]}, ${formatDate(value)}`;
}

/** «2 ч. 15 мин.» — человекочитаемая длительность. */
export function formatDuration(ms: number): string {
	const totalMinutes = Math.max(0, Math.round(ms / 60000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `${minutes} мин.`;
	return `${hours} ч. ${minutes} мин.`;
}

/** Целое число минут до момента (отрицательное — момент в прошлом). */
export function minutesUntil(target: Date | string, now: Date = new Date()): number {
	return Math.round((new Date(target).getTime() - now.getTime()) / 60000);
}
