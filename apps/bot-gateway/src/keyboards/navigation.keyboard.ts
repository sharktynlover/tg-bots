import { InlineKeyboard } from 'grammy';

export function floorPlanKeyboard(cabinet: string): InlineKeyboard {
	return new InlineKeyboard().text('🗺 Показать схему этажа', `nav:plan:${cabinet}`);
}
