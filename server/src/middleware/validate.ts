import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../lib/errors.js';

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const code = issue?.path[0] === 'url' ? 'INVALID_URL' : 'VALIDATION_ERROR';
    throw new AppError(400, code, issue?.message ?? 'Invalid request.');
  }
  return result.data;
}
