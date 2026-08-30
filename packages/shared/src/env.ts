import 'dotenv/config';

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Не задана переменная окружения ${name}`);
	return value;
}

function optional(name: string, fallback: string): string {
	return process.env[name] || fallback;
}

export const env = {
	get telegramBotToken(): string {
		return required('TELEGRAM_BOT_TOKEN');
	},
	get databaseUrl(): string {
		return required('DATABASE_URL');
	},
	get rabbitUrl(): string {
		return optional('RABBITMQ_URL', 'amqp://localhost:5672');
	},
	get redisUrl(): string | null {
		return process.env.REDIS_URL || null;
	},
	get collegeApiUrl(): string {
		return optional('COLLEGE_API_URL', 'https://akademiks.urtt.ru');
	},
	get adminIds(): number[] {
		return optional('ADMIN_IDS', '')
			.split(',')
			.map((id) => Number(id.trim()))
			.filter((id) => Number.isFinite(id) && id > 0);
	},
	get scheduleCron(): string {
		return optional('SCHEDULE_CRON', '*/5 * * * *');
	},
	get prescheduleCron(): string {
		return optional('PRESCHEDULE_CRON', '*/20 * * * 5');
	},
	get reminderCron(): string {
		return optional('REMINDER_CRON', '* * * * *');
	},
	get logLevel(): string {
		return optional('LOG_LEVEL', 'info');
	},
} as const;

/** Часовой пояс колледжа: всё форматирование времени идёт в нём. */
export const COLLEGE_TIMEZONE = 'Asia/Yekaterinburg';

/** Пороги напоминаний, которые генерирует schedule-service. */
export const REMINDER_OFFSETS = [5, 10, 15] as const;
