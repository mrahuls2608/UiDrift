import type { Server } from 'node:http';
import type { Worker } from 'bullmq';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { connectDb, disconnectDb } from './lib/db.js';
import { closeRedis } from './lib/redis.js';
import { createApp } from './app.js';
import { closeQueue, startScanWorker } from './queue/scan-queue.js';
import { scanEventBus } from './queue/events.js';
import { processScan } from './services/pipeline.js';
import { failStaleScans } from './services/scan.service.js';

async function main() {
  await connectDb();
  const stale = await failStaleScans();
  if (stale) logger.warn({ stale }, 'Marked interrupted scans as failed');

  const server: Server = createApp().listen(env.PORT, () =>
    logger.info(`API listening on :${env.PORT}`),
  );
  const worker: Worker | undefined = env.RUN_WORKER_INLINE
    ? startScanWorker(processScan)
    : undefined;

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close();
    await worker?.close();
    await Promise.allSettled([scanEventBus.close(), closeQueue(), closeRedis(), disconnectDb()]);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
