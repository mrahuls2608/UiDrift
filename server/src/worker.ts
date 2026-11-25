import { logger } from './lib/logger.js';
import { connectDb, disconnectDb } from './lib/db.js';
import { closeRedis } from './lib/redis.js';
import { startScanWorker } from './queue/scan-queue.js';
import { processScan } from './services/pipeline.js';
import { failStaleScans } from './services/scan.service.js';

/** Standalone worker process (use with RUN_WORKER_INLINE=false on the API). */
async function main() {
  await connectDb();
  await failStaleScans();
  const worker = startScanWorker(processScan);
  const shutdown = async () => {
    await worker.close();
    await Promise.allSettled([closeRedis(), disconnectDb()]);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker failed to start');
  process.exit(1);
});
