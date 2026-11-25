import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { LlmConfigInput } from '@uidrift/shared';
import { env } from '../../config/env.js';
import { redis } from '../../lib/redis.js';

/**
 * Short-lived, encrypted hand-off of a user's LLM key from the API to the scan worker.
 * The key is never written to MongoDB, never logged, never returned by the API, and never read
 * from environment variables. It is AES-256-GCM encrypted, expires after 15 minutes, and is
 * deleted the moment the worker reads it.
 */

const TTL_SECONDS = 15 * 60;
const keyFor = (scanId: string) => `uidrift:llm-key:${scanId}`;
const secret = () => createHash('sha256').update(`${env.JWT_SECRET}:uidrift-llm-vault:v1`).digest();

export function encrypt(config: LlmConfigInput): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

export function decrypt(payload: string): LlmConfigInput {
  const raw = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', secret(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'),
  ) as LlmConfigInput;
}

export async function storeLlmConfig(scanId: string, config: LlmConfigInput): Promise<void> {
  await redis().set(keyFor(scanId), encrypt(config), 'EX', TTL_SECONDS);
}

/** Read and delete in one step (GETDEL), so a key can be used at most once. */
export async function takeLlmConfig(scanId: string): Promise<LlmConfigInput | null> {
  const payload = await redis().getdel(keyFor(scanId));
  if (!payload) return null;
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}
