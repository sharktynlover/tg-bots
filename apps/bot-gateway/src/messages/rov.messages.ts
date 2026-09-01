import { formatDate, formatTime } from '@college/shared';
import type { RovEntry } from '../services/rov.service';
import { escapeHtml } from './schedule.messages';

function entryLine(entry: RovEntry): string {
	const title = escapeHtml(entry.groupTitle);
	if (entry.failed) return `${title} — ошибка запроса`;
	if (entry.lessons.length === 0) return `${title} — нет`;
	const slots = entry.lessons
		.map(
			(lesson) =>
				`${formatDate(lesson.start)} — ${lesson.index} пара (${formatTime(lesson.start)})`,
		)
		.join('; ');
	return `${title} — есть — ${slots}`;
}

export const Rov = {
	scanning: () => '🔎 Сканирую расписание всех групп, это займёт около минуты…',
	usage: () => 'Формат: /rov  или  /rov next  или  /rov prev',
	/** Заголовок плюс строки «группа — есть/нет — дата — номер пары». */
	report: (weekStart: Date, entries: RovEntry[]): string[] => {
		const withLesson = entries.filter((entry) => entry.lessons.length > 0).length;
		const header = [
			`📋 <b>Разговоры о важном</b> — неделя с ${formatDate(weekStart)}`,
			`Есть у ${withLesson} из ${entries.length} групп`,
			'',
		].join('\n');

		const chunks: string[] = [];
		let current = header;
		for (const entry of entries) {
			const line = entryLine(entry);
			if (current.length + line.length + 1 > 3800) {
				chunks.push(current);
				current = '';
			}
			current += `${line}\n`;
		}
		if (current.trim()) chunks.push(current);
		return chunks;
	},
	accessList: (ids: number[]) =>
		ids.length === 0
			? 'Доступ к /rov есть только у администрации.'
			: ['🔐 <b>Доступ к /rov</b>', '', ...ids.map((id) => `• <code>${id}</code>`)].join('\n'),
	accessUsage: () => 'Формат: /rov_access  |  /rov_access add 123456  |  /rov_access del 123456',
	granted: (id: number) => `Доступ к /rov выдан <code>${id}</code>.`,
	revoked: (id: number) => `Доступ к /rov забран у <code>${id}</code>.`,
};
