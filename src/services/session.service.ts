import { inject, singleton } from 'tsyringe';
import type { RedisClient } from '@/config/redis.config';
import { REDIS_TOKEN } from '@/config/redis.config';
import { IDLE_STATE, type SessionState } from '@/types/session';

const SESSION_TTL_SECONDS = 60 * 60 * 24;

@singleton()
export class SessionService {
  constructor(@inject(REDIS_TOKEN) private readonly redis: RedisClient) {}

  private key(userId: number): string {
    return `session:${userId}`;
  }

  async get(userId: number): Promise<SessionState> {
    const raw = await this.redis.get(this.key(userId));
    if (!raw) return IDLE_STATE;
    try {
      return JSON.parse(raw) as SessionState;
    } catch {
      return IDLE_STATE;
    }
  }

  async set(userId: number, state: SessionState): Promise<void> {
    if (state.step === 'idle') {
      await this.redis.del(this.key(userId));
      return;
    }
    await this.redis.set(this.key(userId), JSON.stringify(state), 'EX', SESSION_TTL_SECONDS);
  }

  async clear(userId: number): Promise<void> {
    await this.redis.del(this.key(userId));
  }
}
