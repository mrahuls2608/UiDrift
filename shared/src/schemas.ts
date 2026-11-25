import { z } from 'zod';
import { LLM_PROVIDERS, SCAN_LIMITS, SOURCE_LIMITS } from './constants.js';

/**
 * Optional, per-audit LLM settings typed by the user. Never read from the environment and never
 * stored: the key is held encrypted in Redis for at most 15 minutes and deleted when used.
 */
export const llmConfigSchema = z
  .object({
    provider: z.enum(LLM_PROVIDERS),
    apiKey: z.string().trim().min(8, 'Enter your API key').max(500),
    model: z.string().trim().max(100).optional(),
    baseUrl: z.string().trim().url('Enter a valid base URL').max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.provider !== 'anthropic' && !v.model) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['model'], message: 'Enter a model name' });
    }
    if (v.provider === 'openai-compatible' && !v.baseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseUrl'],
        message: 'Enter the base URL',
      });
    }
  });

export type LlmConfigInput = z.infer<typeof llmConfigSchema>;

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
  llm: llmConfigSchema.optional(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

const sourceFileSchema = z.object({
  path: z.string().trim().min(1).max(400),
  content: z.string().max(SOURCE_LIMITS.MAX_FILE_BYTES),
});

export const githubRepoSchema = z
  .string()
  .trim()
  .regex(
    /^(https:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/tree\/[A-Za-z0-9_./-]+)?\/?$/,
    'Enter a public GitHub repository URL, e.g. https://github.com/owner/repo',
  );

/** Source-code audit: files read in the browser (ZIP or pasted) or a public GitHub repository. */
export const createSourceScanSchema = z.object({
  source: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('files'),
      label: z.string().trim().min(1).max(120),
      files: z.array(sourceFileSchema).min(1, 'Add at least one file').max(SOURCE_LIMITS.MAX_FILES),
    }),
    z.object({ type: z.literal('github'), repo: githubRepoSchema }),
  ]),
  llm: llmConfigSchema.optional(),
});

export type CreateSourceScanInput = z.infer<typeof createSourceScanSchema>;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().trim().max(80).optional(),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

export const exportFormatSchema = z.enum(['css', 'json', 'react']);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
