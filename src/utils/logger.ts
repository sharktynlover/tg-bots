import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import pino from 'pino';
import { env } from '@/config/env.config';

function buildLogger(service: string): pino.Logger {
  const streams: pino.StreamEntry[] = [{ level: env.LOG_LEVEL, stream: pino.destination(1) }];

  try {
    mkdirSync(dirname(env.LOG_FILE_PATH), { recursive: true });
    streams.push({
      level: env.LOG_LEVEL,
      stream: pino.destination({ dest: env.LOG_FILE_PATH, append: true, mkdir: true, sync: false }),
    });
  } catch {
    // File logging is best-effort: stdout stays the source of truth in containers.
  }

  return pino(
    {
      level: env.LOG_LEVEL,
      base: { service },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream(streams),
  );
}

export const logger = buildLogger(process.env.SERVICE_NAME ?? 'bot-service');

export function childLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}
