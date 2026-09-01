import 'reflect-metadata';
import cron from 'node-cron';
import { container } from 'tsyringe';
import {
	closeDb,
	closeMq,
	COLLEGE_TIMEZONE,
	consume,
	createLogger,
	env,
	Queues,
	toErrorMeta,
} from '@college/shared';
import { ParserService } from './services/parser.service';
import { PreScheduleService } from './services/preschedule.service';
import { ReminderService } from './services/reminder.service';

const log = createLogger('schedule-service');

const parser = container.resolve(ParserService);
const preschedule = container.resolve(PreScheduleService);
const reminders = container.resolve(ReminderService);

const options = { timezone: COLLEGE_TIMEZONE } as const;

/** Не даём задаче наложиться саму на себя, если API отвечает медленно. */
function job(name: string, run: () => Promise<void>): () => void {
	let running = false;
	return () => {
		if (running) {
			log.warn('Предыдущий запуск ещё идёт, пропуск', { job: name });
			return;
		}
		running = true;
		void run()
			.catch((error) =>
				log.error('Задача завершилась с ошибкой', { job: name, ...toErrorMeta(error) }),
			)
			.finally(() => {
				running = false;
			});
	};
}

cron.schedule(
	env.scheduleCron,
	job('schedule', () => parser.syncAll()),
	options,
);
cron.schedule(
	env.prescheduleCron,
	job('preschedule', () => preschedule.sync()),
	options,
);
cron.schedule(
	env.reminderCron,
	job('reminders', () => reminders.tick()),
	options,
);

await consume(Queues.requests, async ({ groupApiId }) => {
	log.info('Внеочередной парсинг группы', { groupApiId });
	await parser.syncGroup(groupApiId);
});

await parser.syncAll();

async function shutdown(signal: string): Promise<void> {
	log.info('Остановка', { signal });
	await closeMq();
	await closeDb();
	process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

log.info('schedule-service запущен', {
	schedule: env.scheduleCron,
	preschedule: env.prescheduleCron,
	reminders: env.reminderCron,
});
