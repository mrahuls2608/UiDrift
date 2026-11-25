import type { ComponentType } from './types.js';

/** Ideal variant counts from PRD §9. */
export const IDEAL_VARIANTS = {
  button: 3,
  input: 2,
  heading: 6,
  link: 3,
  card: 3,
  colors: 12,
  fontSizes: 8,
  spacing: 8,
  radius: 4,
} as const;

/** Weights for the overall score (PRD §9). */
export const SCORE_WEIGHTS = {
  components: 0.4,
  colors: 0.2,
  typography: 0.2,
  spacing: 0.1,
  radius: 0.1,
} as const;

export const MAX_A11Y_PENALTY = 10;

export const COMPONENT_TYPES: ComponentType[] = ['button', 'input', 'heading', 'link', 'card'];

export const SCAN_LIMITS = {
  MAX_PAGES: 10,
  MAX_ELEMENTS_PER_PAGE: 300,
  PAGE_TIMEOUT_MS: 20_000,
  SCAN_TIMEOUT_MS: 90_000,
} as const;

export type ScoreLabel = 'Consistent' | 'Drifting' | 'Chaotic';

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'Consistent';
  if (score >= 50) return 'Drifting';
  return 'Chaotic';
}

export function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}

/** Limits for source-code audits (shared by the browser, the API and the CLI). */
export const SOURCE_LIMITS = {
  MAX_FILES: 2000,
  MAX_FILE_BYTES: 400_000,
  MAX_TOTAL_BYTES: 6_000_000,
  MAX_ZIP_BYTES: 40_000_000,
} as const;

/** File types the static analyzer understands. */
export const SOURCE_EXTENSIONS = [
  'css',
  'scss',
  'sass',
  'less',
  'html',
  'htm',
  'vue',
  'svelte',
  'astro',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
] as const;

const IGNORED_DIRS =
  /(^|\/)(node_modules|dist|build|out|\.next|\.nuxt|\.svelte-kit|coverage|vendor|\.git|\.turbo|\.cache|storybook-static)(\/|$)/;

/** True when a path should be fed to the analyzer (right extension, not generated/vendored/minified). */
export function isAnalyzablePath(path: string): boolean {
  const p = path.replace(/\\/g, '/');
  if (IGNORED_DIRS.test(p)) return false;
  if (/\.min\.(css|js)$|\.d\.ts$|\.map$/.test(p)) return false;
  const ext = p.split('.').pop()?.toLowerCase() ?? '';
  return (SOURCE_EXTENSIONS as readonly string[]).includes(ext);
}

export const LLM_PROVIDERS = ['anthropic', 'openai', 'openai-compatible'] as const;
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';
