import { Bot } from 'grammy';
import { createLogger, env, toErrorMeta } from '@college/shared';

const log = createLogger('bot');

let instance: Bot | null = null;

export function getBot(): Bot {
	if (instance) return instance;
	instance = new Bot(env.telegramBotToken);
	instance.api.config.use((prev, method, payload, signal) =>
		prev(method, { parse_mode: 'HTML', ...payload }, signal),
	);
	instance.catch((error) => log.error('Необработанная ошибка бота', toErrorMeta(error.error)));
	return instance;
}

export const COMMANDS = [
	{ command: 'start', description: 'Выбрать группу' },
	{ command: 'schedule', description: 'Расписание на неделю' },
	{ command: 'next', description: 'Следующая пара' },
	{ command: 'preschedule', description: 'Предрасписание' },
	{ command: 'cabinet', description: 'Как найти кабинет' },
	{ command: 'export', description: 'Экспорт в календарь' },
	{ command: 'settings', description: 'Настройки' },
	{ command: 'feedback', description: 'Написать администрации' },
	{ command: 'help', description: 'Что я умею' },
];
