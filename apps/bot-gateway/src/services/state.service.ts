import Redis from 'ioredis';
import { singleton } from 'tsyringe';
import { env } from '@college/shared';

/** Шаг пошагового сценария, которого бот ждёт от пользователя. */
export type PendingAction = 'cabinet' | 'feedback';

const TTL_SECONDS = 300;

/**
 * Короткоживущее состояние диалога.
 * Redis используется, когда он настроен, иначе достаточно памяти процесса.
 */
@singleton()
export class StateService {
	private readonly redis = env.redisUrl ? new Redis(env.redisUrl, { lazyConnect: true }) : null;
	private readonly memory = new Map<number, { action: PendingAction; expiresAt: number }>();

	private key(telegramId: number): string {
		return `pending:${telegramId}`;
	}

	async set(telegramId: number, action: PendingAction): Promise<void> {
		if (this.redis) {
			await this.redis.set(this.key(telegramId), action, 'EX', TTL_SECONDS);
			return;
		}
		this.memory.set(telegramId, { action, expiresAt: Date.now() + TTL_SECONDS * 1000 });
	}

	async take(telegramId: number): Promise<PendingAction | null> {
		if (this.redis) {
			const value = await this.redis.getdel(this.key(telegramId));
			return (value as PendingAction | null) ?? null;
		}
		const entry = this.memory.get(telegramId);
		this.memory.delete(telegramId);
		if (!entry || entry.expiresAt < Date.now()) return null;
		return entry.action;
	}

	async clear(telegramId: number): Promise<void> {
		if (this.redis) await this.redis.del(this.key(telegramId));
		else this.memory.delete(telegramId);
	}
}
