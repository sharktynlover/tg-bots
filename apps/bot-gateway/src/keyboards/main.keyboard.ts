import { Keyboard } from 'grammy';

export const MainButtons = {
	schedule: '📅 Расписание',
	next: '🔮 Следующая',
	cabinet: '📍 Кабинет',
	settings: '⚙️ Настройки',
	export: '📥 Экспорт',
	feedback: '💬 Фидбек',
} as const;

export function mainKeyboard(): Keyboard {
	return new Keyboard()
		.text(MainButtons.schedule)
		.text(MainButtons.next)
		.row()
		.text(MainButtons.cabinet)
		.text(MainButtons.export)
		.row()
		.text(MainButtons.settings)
		.text(MainButtons.feedback)
		.resized()
		.persistent();
}
