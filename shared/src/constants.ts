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
