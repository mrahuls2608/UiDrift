import { Queue, Worker } from 'bullmq';
import { createRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

export const SCAN_QUEUE = 'uidrift-scans';

interface ScanJob {
  scanId: string;
}

let queue: Queue<ScanJob> | undefined;

export function scanQueue(): Queue<ScanJob> {
  queue ??= new Queue<ScanJob>(SCAN_QUEUE, {
    connection: createRedis('queue'),
    defaultJobOptions: { attempts: 1, removeOnComplete: 200, removeOnFail: 200 },
  });
  return queue;
}

export async function enqueueScan(scanId: string): Promise<number> {
  await scanQueue().add('scan', { scanId }, { jobId: scanId });
  return scanQueue().getWaitingCount();
}

/** Concurrency 1: Puppeteer scans run one at a time to fit free-tier memory. */
export function startScanWorker(processor: (scanId: string) => Promise<void>): Worker<ScanJob> {
  const worker = new Worker<ScanJob>(SCAN_QUEUE, (job) => processor(job.data.scanId), {
    connection: createRedis('worker'),
    concurrency: 1,
    lockDuration: 150_000,
  });
  worker.on('failed', (job, err) =>
    logger.error({ err: err.message, scanId: job?.data.scanId }, 'scan job failed'),
  );
  worker.on('ready', () => logger.info('Scan worker ready'));
  return worker;
}

export async function closeQueue(): Promise<void> {
  await queue?.close();
  queue = undefined;
}
