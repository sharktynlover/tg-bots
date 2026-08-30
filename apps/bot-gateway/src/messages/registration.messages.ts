export const Registration = {
	welcome: () => 'Привет! 👋\nЯ подскажу расписание. Выбери специальность:',
	chooseCourse: (specialty: string) => `${specialty} — отлично. Теперь курс:`,
	chooseGroup: (specialty: string, course: number) => `${specialty}, ${course} курс. Твоя группа:`,
	registered: (group: string) =>
		[
			`Готово, запомнил: ${group} ✅`,
			'',
			'Расписание уже подтягиваю. Жми «📅 Расписание» или /next.',
		].join('\n'),
	changed: (group: string) => `Сменил группу на ${group} ✅`,
	unknownGroup: () => 'Такой группы нет в списке. Начни заново: /start',
};
