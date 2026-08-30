import { env } from '../env';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;

type Level = keyof typeof LEVELS;

function write(level: Level, scope: string, message: string, meta?: unknown): void {
	const threshold = LEVELS[(env.logLevel as Level) in LEVELS ? (env.logLevel as Level) : 'info'];
	if (LEVELS[level] < threshold) return;
	const line = JSON.stringify({
		time: new Date().toISOString(),
		level,
		scope,
		message,
		...(meta === undefined ? {} : { meta }),
	});
	if (level === 'error' || level === 'warn') console.error(line);
	else console.log(line);
}

export function createLogger(scope: string) {
	return {
		debug: (message: string, meta?: unknown) => write('debug', scope, message, meta),
		info: (message: string, meta?: unknown) => write('info', scope, message, meta),
		warn: (message: string, meta?: unknown) => write('warn', scope, message, meta),
		error: (message: string, meta?: unknown) => write('error', scope, message, meta),
	};
}

export type Logger = ReturnType<typeof createLogger>;

/** Сериализация ошибки для логов. */
export function toErrorMeta(error: unknown): { error: string; stack?: string } {
	if (error instanceof Error) return { error: error.message, stack: error.stack };
	return { error: String(error) };
}
