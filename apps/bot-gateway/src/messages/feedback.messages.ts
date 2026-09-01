export const Feedback = {
	ask: () => 'Напиши сообщение для администрации — я передам.',
	sent: () => 'Отправил ✅ Ответ придёт сюда же.',
	noAdmins: () => 'Сейчас некому передать сообщение 😔',
	toAdmin: (telegramId: number, username: string | undefined, text: string) =>
		[
			'💬 Фидбек',
			`От: ${username ? `@${username}` : 'без username'} (ID: ${telegramId})`,
			'',
			text,
			'',
			'Ответь на это сообщение (Reply), и я перешлю ответ студенту.',
		].join('\n'),
	replyToUser: (text: string) => `💬 Ответ администрации:\n\n${text}`,
	replySent: () => 'Ответ доставлен ✅',
	replyFailed: () => 'Не смог доставить ответ — студент, похоже, заблокировал бота.',
};
