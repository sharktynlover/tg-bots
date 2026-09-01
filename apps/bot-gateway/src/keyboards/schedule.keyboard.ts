import { InlineKeyboard } from 'grammy';
import { getWeekdayIndex, WEEKDAYS_SHORT, type WeekSchedule } from '@college/shared';

export type ScheduleScope = 'cur' | 'pre';

/** Переключатель дней: один ряд кнопок «Пн … Сб», активный день помечен точкой. */
export function daysKeyboard(
	week: WeekSchedule,
	scope: ScheduleScope,
	activeIndex: number,
): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	week.days.forEach((day, index) => {
		const label = WEEKDAYS_SHORT[getWeekdayIndex(new Date(day.date))] ?? '?';
		keyboard.text(index === activeIndex ? `•${label}•` : label, `sched:${scope}:${index}`);
	});
	return keyboard;
}
