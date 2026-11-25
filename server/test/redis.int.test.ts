import { afterAll, describe, expect, it } from 'vitest';
import type { ScanEvent } from '@uidrift/shared';

/** Runs only when TEST_REDIS_URL points at a real Redis (CI starts one as a service). */
const url = process.env.TEST_REDIS_URL;

describe.skipIf(!url)('Redis integration', async () => {
  process.env.REDIS_URL = url;
  const events = await import('../src/queue/events.js');
  const queue = await import('../src/queue/scan-queue.js');
  const { closeRedis, redis } = await import('../src/lib/redis.js');

  afterAll(async () => {
    await events.scanEventBus.close();
    await queue.scanQueue().obliterate({ force: true });
    await queue.closeQueue();
    await closeRedis();
  });

  const event = (scanId: string, type: ScanEvent['type'], message: string): ScanEvent => ({
    type,
    scanId,
    message,
    progress: { pagesDone: 0, pagesTotal: 1, step: type },
    at: new Date().toISOString(),
  });

  it('fans published events out to subscribers and keeps a bounded log', async () => {
    const scanId = `t${Date.now()}`;
    const received: string[] = [];
    const unsubscribe = events.scanEventBus.subscribe(scanId, (e) => received.push(e.message));
    await new Promise((r) => setTimeout(r, 200)); // let the pattern subscription settle
    for (let i = 0; i < 25; i++) await events.publishScanEvent(event(scanId, 'page_done', `m${i}`));
    await new Promise((r) => setTimeout(r, 200));
    unsubscribe();
    expect(received).toHaveLength(25);
    const log = await events.recentScanEvents(scanId);
    expect(log).toHaveLength(20);
    expect(log.at(-1)?.message).toBe('m24');
    expect(await redis().ttl(`uidrift:scan-log:${scanId}`)).toBeGreaterThan(0);
  });

  it('stores cancel requests', async () => {
    const scanId = `c${Date.now()}`;
    expect(await events.isCancelRequested(scanId)).toBe(false);
    await events.requestCancel(scanId);
    expect(await events.isCancelRequested(scanId)).toBe(true);
  });

  it('processes queued scans one at a time', async () => {
    let running = 0;
    let maxRunning = 0;
    const done: string[] = [];
    const worker = queue.startScanWorker(async (scanId) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 50));
      running--;
      done.push(scanId);
    });
    const ids = ['a', 'b', 'c'].map((s) => `${s}${Date.now()}`);
    for (const id of ids) await queue.enqueueScan(id);
    await expect.poll(() => done.length, { timeout: 10_000 }).toBe(3);
    await worker.close();
    expect(done).toEqual(ids);
    expect(maxRunning).toBe(1);
  });
});
