import { singleton } from 'tsyringe';
import { Classrooms } from '@college/shared';

export interface CabinetLocation {
	name: string;
	floor: number;
	wing: string;
	hint: string;
}

const WINGS = [
	{ from: 1, to: 19, name: 'Правое крыло', landmark: 'лестница справа от гардероба' },
	{ from: 20, to: 49, name: 'Главный корпус', landmark: 'центральная лестница у поста охраны' },
	{ from: 50, to: 66, name: 'Левое крыло', landmark: 'лестница за столовой' },
] as const;

/** Схемы этажей: ASCII-арт по крылу, одинаковый для всех этажей корпуса. */
const FLOOR_PLANS: Record<string, string> = {
	'Правое крыло': ['[01][03][05][07][09]', '  ↑ лестница  ', '[02][04][06][08][10..19]'].join('\n'),
	'Главный корпус': [
		'[20][22][24][26][28]',
		'  ↑ холл, лестница  ',
		'[21][23][25][27][29..49]',
	].join('\n'),
	'Левое крыло': ['[50][52][54][56][58]', '  ↑ лестница  ', '[51][53][55][57][59..66]'].join('\n'),
};

@singleton()
export class NavigationService {
	/** Кабинеты вне нумерации (спортзал, музей и т.п.). */
	isSpecial(name: string): boolean {
		return name in Classrooms && !/^\d+$/.test(name);
	}

	/** Номер -> этаж и корпус: первая цифра — этаж, остаток — номер в крыле. */
	locate(input: string): CabinetLocation | null {
		const name = input.trim();
		if (!/^\d{3}$/.test(name)) return null;
		const floor = Number(name[0]);
		const roomNumber = Number(name.slice(1));
		const wing = WINGS.find((item) => roomNumber >= item.from && roomNumber <= item.to);
		if (!wing || floor < 1) return null;
		return {
			name,
			floor,
			wing: wing.name,
			hint: `Поднимись на ${floor} этаж — ${wing.landmark}, дальше по указателям до ${name}.`,
		};
	}

	floorPlan(location: CabinetLocation): string {
		return FLOOR_PLANS[location.wing] ?? 'Схемы для этого крыла пока нет.';
	}
}
