import { z } from 'zod';

const idList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map(Number),
  );

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_API_ROOT: z.string().url().optional().or(z.literal('')),
  TELEGRAM_PROXY_URL: z.string().url().optional().or(z.literal('')),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(20),

  REDIS_URL: z.string().min(1),

  DEVELOPER_TELEGRAM_ID: z.coerce.number().int(),
  ADMIN_TELEGRAM_IDS: idList,

  SUPERLIKES_PER_WEEK: z.coerce.number().int().nonnegative().default(1),
  MAX_PHOTOS: z.coerce.number().int().positive().default(3),
  MIN_AGE: z.coerce.number().int().positive().default(15),
  MAX_AGE: z.coerce.number().int().positive().default(25),
  MAX_DESCRIPTION_LENGTH: z.coerce.number().int().positive().default(150),
  SPAM_LIKE_THRESHOLD: z.coerce.number().min(0).max(1).default(1),
  SPAM_LIKE_MIN_ACTIONS: z.coerce.number().int().positive().default(30),
  SPAM_LIKE_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(7200),

  PORT: z.coerce.number().int().positive().default(3000),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_FILE_PATH: z.string().default('/var/log/bot.log'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export const isWebhookMode = Boolean(env.TELEGRAM_WEBHOOK_URL);
