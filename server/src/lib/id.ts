import { objectIdSchema } from '@uidrift/shared';
import { AppError } from './errors.js';

export function parseId(value: unknown): string {
  const result = objectIdSchema.safeParse(value);
  if (!result.success) throw new AppError(400, 'INVALID_ID', 'Invalid id.');
  return result.data;
}
