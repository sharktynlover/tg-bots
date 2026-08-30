import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import pino from 'pino';
import { env } from '@/config/env.config';

function buildLogger(service: string): pino.Logger {
  const targets: pino.TransportTargetOptions[] = [
    {
      target: 'pino/file',
      level: env.LOG_LEVEL,
      options: { destination: 1 },
    },
  ];

  try {
    mkdirSync(dirname(env.LOG_FILE_PATH), { recursive: true });
    targets.push({
      target: 'pino-roll',
      level: env.LOG_LEVEL,
      options: { file: env.LOG_FILE_PATH, frequency: 'daily', mkdir: true },
    });
  } catch {
    // File logging is best-effort: stdout stays the source of truth in containers.
  }

  return pino({
    level: env.LOG_LEVEL,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: { targets },
  });
}

export const logger = buildLogger(process.env.SERVICE_NAME ?? 'bot-service');

export function childLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}
