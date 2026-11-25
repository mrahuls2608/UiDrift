import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/** Create a Redis connection. BullMQ requires maxRetriesPerRequest: null. */
export function createRedis(name: string): Redis {
  const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
  client.on('error', (err) => logger.warn({ err: err.message, name }, 'Redis error'));
  return client;
}

let shared: Redis | undefined;

/** Shared connection for regular commands (cache, rate limiting, publishing). */
export function redis(): Redis {
  shared ??= createRedis('shared');
  return shared;
}

export async function closeRedis(): Promise<void> {
  if (shared) {
    await shared.quit().catch(() => undefined);
    shared = undefined;
  }
}
