import { createHash } from 'node:crypto';

/** MD5-хэш сырого ответа API — используется для детекта изменений. */
export function md5(value: unknown): string {
	const payload = typeof value === 'string' ? value : JSON.stringify(value);
	return createHash('md5').update(payload).digest('hex');
}
