import type { SourceFile } from '@uidrift/shared';
import { redis } from '../lib/redis.js';

/** Uploaded/pasted source files wait in Redis (never MongoDB) until the worker reads them once. */
const keyFor = (scanId: string) => `uidrift:source-files:${scanId}`;
const TTL_SECONDS = 60 * 60;

export async function storeSourceFiles(scanId: string, files: SourceFile[]): Promise<void> {
  await redis().set(keyFor(scanId), JSON.stringify(files), 'EX', TTL_SECONDS);
}

export async function takeSourceFiles(scanId: string): Promise<SourceFile[] | null> {
  const raw = await redis().getdel(keyFor(scanId));
  return raw ? (JSON.parse(raw) as SourceFile[]) : null;
}
