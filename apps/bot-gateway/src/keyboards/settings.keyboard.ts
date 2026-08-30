import { InlineKeyboard } from 'grammy';
import { REMINDER_OFFSETS, type ScheduleFormat } from '@college/shared';

export function settingsKeyboard(
	reminderOffset: number | null,
	format: ScheduleFormat,
): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	for (const offset of REMINDER_OFFSETS) {
		keyboard.text(
			`${reminderOffset === offset ? '✅ ' : ''}за ${offset} мин.`,
			`set:rem:${offset}`,
		);
	}
	keyboard.row().text(`${reminderOffset === null ? '✅ ' : ''}🔕 выключить`, 'set:rem:off');
	keyboard
		.row()
		.text(`${format === 'detailed' ? '✅ ' : ''}📖 подробно`, 'set:fmt:detailed')
		.text(`${format === 'compact' ? '✅ ' : ''}⚡ компактно`, 'set:fmt:compact');
	return keyboard.row().text('🔁 Сменить группу', 'set:group');
}
