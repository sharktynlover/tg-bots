import type { ScheduleFormat } from '@college/shared';

export const Settings = {
	title: (group: string, reminderOffset: number | null, format: ScheduleFormat) =>
		[
			'⚙️ Настройки',
			'',
			`Группа: ${group}`,
			`Напоминания: ${reminderOffset ? `за ${reminderOffset} мин.` : 'выключены'}`,
			`Формат расписания: ${format === 'detailed' ? 'подробный' : 'компактный'}`,
		].join('\n'),
	reminderSaved: (offset: number | null) =>
		offset ? `Буду напоминать за ${offset} мин. ⏰` : 'Напоминания выключил 🔕',
	formatSaved: (format: ScheduleFormat) =>
		format === 'detailed' ? 'Формат: подробный 📖' : 'Формат: компактный ⚡',
};
