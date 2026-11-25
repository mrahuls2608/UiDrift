import { z } from 'zod';
import { SCAN_LIMITS } from './constants.js';

export const createScanSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .max(2048)
    .transform((v) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url('Enter a valid URL')),
  maxPages: z.coerce
    .number()
    .int()
    .min(1)
    .max(SCAN_LIMITS.MAX_PAGES)
    .default(SCAN_LIMITS.MAX_PAGES),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

export const exportFormatSchema = z.enum(['css', 'json', 'react']);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
