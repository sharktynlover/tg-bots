import Redis from 'ioredis';
import { env } from '@/config/env.config';

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export type RedisClient = Redis;

export const REDIS_TOKEN = Symbol.for('Redis');
