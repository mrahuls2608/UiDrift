import { EventEmitter } from 'node:events';
import type { Redis } from 'ioredis';
import type { ScanEvent, ScanEventType } from '@uidrift/shared';
import { createRedis, redis } from '../lib/redis.js';

const PREFIX = 'uidrift:scan-events:';
const logKey = (scanId: string) => `uidrift:scan-log:${scanId}`;
const cancelKey = (scanId: string) => `uidrift:scan-cancel:${scanId}`;
const LOG_SIZE = 20;
const TTL_SECONDS = 60 * 60;

export const TERMINAL_EVENTS: ScanEventType[] = ['done', 'failed', 'cancelled'];

/** Publish a progress event to live subscribers and keep the latest ones for late joiners. */
export async function publishScanEvent(event: ScanEvent): Promise<void> {
  const payload = JSON.stringify(event);
  await redis()
    .multi()
    .rpush(logKey(event.scanId), payload)
    .ltrim(logKey(event.scanId), -LOG_SIZE, -1)
    .expire(logKey(event.scanId), TTL_SECONDS)
    .publish(`${PREFIX}${event.scanId}`, payload)
    .exec();
}

export async function recentScanEvents(scanId: string): Promise<ScanEvent[]> {
  const items = await redis().lrange(logKey(scanId), 0, -1);
  return items.map((i) => JSON.parse(i) as ScanEvent);
}

export async function requestCancel(scanId: string): Promise<void> {
  await redis().set(cancelKey(scanId), '1', 'EX', TTL_SECONDS);
}

export async function isCancelRequested(scanId: string): Promise<boolean> {
  return (await redis().exists(cancelKey(scanId))) === 1;
}

/**
 * One Redis pattern subscription per API process, fanned out in memory to SSE connections.
 * Works across processes: the worker publishes, any API instance can stream.
 */
class ScanEventBus {
  private sub?: Redis;
  private readonly emitter = new EventEmitter().setMaxListeners(0);

  private ensure(): void {
    if (this.sub) return;
    this.sub = createRedis('subscriber');
    void this.sub.psubscribe(`${PREFIX}*`);
    this.sub.on('pmessage', (_pattern, channel, message) => {
      this.emitter.emit(channel.slice(PREFIX.length), JSON.parse(message) as ScanEvent);
    });
  }

  subscribe(scanId: string, listener: (event: ScanEvent) => void): () => void {
    this.ensure();
    this.emitter.on(scanId, listener);
    return () => this.emitter.off(scanId, listener);
  }

  async close(): Promise<void> {
    await this.sub?.quit().catch(() => undefined);
    this.sub = undefined;
  }
}

export const scanEventBus = new ScanEventBus();
