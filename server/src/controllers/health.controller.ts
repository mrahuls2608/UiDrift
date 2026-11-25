import type { Request, Response } from 'express';
import { isDbReady } from '../lib/db.js';
import { redis } from '../lib/redis.js';

export async function health(_req: Request, res: Response) {
  const redisOk = await Promise.race([
    redis()
      .ping()
      .then((r) => r === 'PONG')
      .catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000)),
  ]);
  const db = isDbReady();
  res
    .status(db && redisOk ? 200 : 503)
    .json({ status: db && redisOk ? 'ok' : 'degraded', db, redis: redisOk });
}
