import { InlineKeyboard } from 'grammy';
import { getCourses, getGroupsByCourse, SpecialtyList, type Specialty } from '@college/shared';

export function specialtiesKeyboard(): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	SpecialtyList.forEach((specialty, index) => {
		keyboard.text(specialty.title, `reg:spec:${specialty.code}`);
		if (index % 3 === 2) keyboard.row();
	});
	return keyboard;
}

export function coursesKeyboard(specialty: Specialty): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	for (const course of getCourses(specialty)) {
		keyboard.text(`${course} курс`, `reg:course:${specialty.code}:${course}`);
	}
	return keyboard.row().text('⬅️ Назад', 'reg:back:spec');
}

export function groupsKeyboard(specialty: Specialty, course: number): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	getGroupsByCourse(specialty, course).forEach(([title, id], index) => {
		keyboard.text(title, `reg:group:${id}`);
		if (index % 2 === 1) keyboard.row();
	});
	return keyboard.row().text('⬅️ Назад', `reg:back:course:${specialty.code}`);
}
