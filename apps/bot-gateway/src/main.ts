import 'reflect-metadata';
import { closeDb, closeMq, consume, createLogger, Queues, toErrorMeta } from '@college/shared';
import { container } from './core/container';
import { COMMANDS, getBot } from './core/bot';
import { registerControllers } from './core/router';
import { AdminController } from './controllers/admin.controller';
import { ExportController } from './controllers/export.controller';
import { FeedbackController } from './controllers/feedback.controller';
import { NavigationController } from './controllers/navigation.controller';
import { NextController } from './controllers/next.controller';
import { RegistrationController } from './controllers/registration.controller';
import { RovController } from './controllers/rov.controller';
import { ScheduleController } from './controllers/schedule.controller';
import { SettingsController } from './controllers/settings.controller';
import { TextController } from './controllers/text.controller';
import { BroadcastService } from './services/broadcast.service';
import { NotificationService } from './services/notification.service';

const log = createLogger('bot-gateway');

const bot = getBot();

registerControllers(bot, [
	RegistrationController,
	ScheduleController,
	NextController,
	SettingsController,
	NavigationController,
	ExportController,
	FeedbackController,
	AdminController,
	RovController,
	TextController,
]);

const notifications = container.resolve(NotificationService);
const broadcasts = container.resolve(BroadcastService);

await consume(Queues.notifications, (event) => notifications.onScheduleEvent(event));
await consume(Queues.preschedule, (event) => notifications.onScheduleEvent(event));
await consume(Queues.reminders, (event) => notifications.onReminder(event));
await consume(Queues.broadcasts, (event) => broadcasts.run(event));

await bot.api.setMyCommands(COMMANDS);

async function shutdown(signal: string): Promise<void> {
	log.info('Остановка', { signal });
	await bot.stop();
	await closeMq();
	await closeDb();
	process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

log.info('bot-gateway запущен');
bot
	.start({ onStart: (me) => log.info('Long polling начат', { username: me.username }) })
	.catch((error) => log.error('Бот остановлен с ошибкой', toErrorMeta(error)));
