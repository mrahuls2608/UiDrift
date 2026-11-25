import 'dotenv/config';
import { z } from 'zod';

const DEV_SECRET = 'dev-only-insecure-secret-change-me';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/uidrift'),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  JWT_SECRET: z.string().min(16).default(DEV_SECRET),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  MAX_PAGES: z.coerce.number().int().min(1).max(10).default(10),
  RUN_WORKER_INLINE: bool.default('true'),
  CHROME_PATH: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  ALLOW_PRIVATE_URLS: bool.default('false'),
  SCAN_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production') {
  if (parsed.data.JWT_SECRET === DEV_SECRET || parsed.data.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be set to at least 32 characters in production');
    process.exit(1);
  }
  if (parsed.data.ALLOW_PRIVATE_URLS) {
    console.error('ALLOW_PRIVATE_URLS cannot be enabled in production');
    process.exit(1);
  }
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
