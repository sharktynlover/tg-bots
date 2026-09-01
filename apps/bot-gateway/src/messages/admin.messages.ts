export const Admin = {
	denied: () => 'Команда только для администрации.',
	panel: () =>
		[
			'🛠 <b>Админ-панель</b>',
			'',
			'/stats — статистика',
			'/broadcast текст — рассылка всем',
			'/broadcast group is-231,is-232 текст — рассылка по группам',
			'/rov — «Разговоры о важном» по всем группам',
			'/rov_access — кому доступна /rov (add/del id)',
		].join('\n'),
	stats: (users: number, groups: number, reminders: number) =>
		[
			'📊 <b>Статистика</b>',
			'',
			`Пользователей: ${users}`,
			`Активных групп: ${groups}`,
			`С включёнными напоминаниями: ${reminders}`,
		].join('\n'),
	broadcastUsage: () => 'Формат: /broadcast текст  или  /broadcast group is-231,is-232 текст',
	broadcastQueued: (target: string) => `Рассылка поставлена в очередь (${target}).`,
	broadcastDone: (sent: number, failed: number) =>
		`Рассылка завершена: доставлено ${sent}, ошибок ${failed}.`,
};
