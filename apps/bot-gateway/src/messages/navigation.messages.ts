import type { CabinetLocation } from '../services/navigation.service';

export const Navigation = {
	ask: () => 'Напиши номер кабинета, например 365.',
	notFound: (input: string) => `Кабинет «${input}» не нашёл. Проверь номер.`,
	special: (name: string) => `📍 ${name} — спроси у вахты, это отдельная локация вне нумерации.`,
	location: (location: CabinetLocation) =>
		[
			`📍 <b>Кабинет ${location.name}</b>`,
			'',
			`🏢 ${location.wing}`,
			`🪜 ${location.floor} этаж`,
			'',
			location.hint,
		].join('\n'),
	floorPlan: (location: CabinetLocation, plan: string) =>
		`Схема ${location.floor} этажа (${location.wing}):\n<pre>${plan}</pre>`,
};
