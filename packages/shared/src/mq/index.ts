import amqplib from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';
import { env } from '../env';
import { createLogger, toErrorMeta } from '../utils/logger';
import type {
	BroadcastEvent,
	NotificationEvent,
	ReminderEvent,
	ScheduleRequestEvent,
} from '../types';

const log = createLogger('rabbitmq');

export const Queues = {
	notifications: 'bot_notifications',
	preschedule: 'bot_preschedule',
	reminders: 'bot_reminders',
	broadcasts: 'admin_broadcasts',
	/** Просьба немедленно спарсить группу — например, сразу после регистрации. */
	requests: 'schedule_requests',
} as const;

export type QueueName = (typeof Queues)[keyof typeof Queues];

export interface QueuePayloads {
	[Queues.notifications]: NotificationEvent;
	[Queues.preschedule]: NotificationEvent;
	[Queues.reminders]: ReminderEvent;
	[Queues.broadcasts]: BroadcastEvent;
	[Queues.requests]: ScheduleRequestEvent;
}

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

async function connect(): Promise<Channel> {
	if (channel) return channel;
	connection = await amqplib.connect(env.rabbitUrl);
	connection.on('error', (error) => log.error('Ошибка соединения', toErrorMeta(error)));
	connection.on('close', () => {
		log.warn('Соединение закрыто');
		connection = null;
		channel = null;
	});
	channel = await connection.createChannel();
	for (const queue of Object.values(Queues)) {
		await channel.assertQueue(queue, { durable: true });
	}
	log.info('Подключение к RabbitMQ установлено');
	return channel;
}

/** Подключение с бесконечными повторами — сервисы стартуют раньше брокера. */
export async function connectWithRetry(delayMs = 3000): Promise<Channel> {
	for (;;) {
		try {
			return await connect();
		} catch (error) {
			log.warn('Не удалось подключиться к RabbitMQ, повтор', toErrorMeta(error));
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
}

export async function publish<Q extends QueueName>(
	queue: Q,
	payload: QueuePayloads[Q],
): Promise<void> {
	const target = await connectWithRetry();
	target.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

export async function consume<Q extends QueueName>(
	queue: Q,
	handler: (payload: QueuePayloads[Q]) => Promise<void>,
): Promise<void> {
	const target = await connectWithRetry();
	await target.prefetch(16);
	await target.consume(queue, (message) => {
		if (!message) return;
		void (async () => {
			try {
				await handler(JSON.parse(message.content.toString()) as QueuePayloads[Q]);
				target.ack(message);
			} catch (error) {
				log.error('Ошибка обработки сообщения', { queue, ...toErrorMeta(error) });
				target.nack(message, false, false);
			}
		})();
	});
	log.info('Подписка на очередь', { queue });
}

export async function closeMq(): Promise<void> {
	await channel?.close().catch(() => undefined);
	await connection?.close().catch(() => undefined);
	channel = null;
	connection = null;
}
