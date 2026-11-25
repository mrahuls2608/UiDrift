import {
  COMPONENT_TYPES,
  IDEAL_VARIANTS,
  MAX_A11Y_PENALTY,
  SCORE_WEIGHTS,
  type ComponentGroup,
  type RawA11yIssue,
  type ScoreBreakdown,
} from '@uidrift/shared';

/** PRD §9: 100 × ideal / max(actual, ideal). A category with no data scores 100. */
export function categoryScore(ideal: number, actual: number): number {
  if (actual <= 0) return 100;
  return (100 * ideal) / Math.max(actual, ideal);
}

/** Average of component-type scores over the types present on the site. */
export function componentsScore(groups: ComponentGroup[]): number {
  const scores = COMPONENT_TYPES.map((type) => ({
    variants: groups.filter((g) => g.type === type).length,
    ideal: IDEAL_VARIANTS[type],
  }))
    .filter((t) => t.variants > 0)
    .map((t) => categoryScore(t.ideal, t.variants));
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
}

const IMPACT_WEIGHT: Record<RawA11yIssue['impact'], number> = {
  critical: 2,
  serious: 1,
  moderate: 0.5,
  minor: 0,
};

/** Accessibility lowers the overall score by up to 10 points (unique rule+page pairs). */
export function a11yPenalty(issues: RawA11yIssue[]): number {
  const unique = new Map<string, RawA11yIssue['impact']>();
  for (const i of issues) unique.set(`${i.id}@${i.page}`, i.impact);
  let total = 0;
  for (const impact of unique.values()) total += IMPACT_WEIGHT[impact];
  return Math.min(MAX_A11Y_PENALTY, Math.round(total));
}

export interface ScoreInput {
  groups: ComponentGroup[];
  colorGroups: number;
  fontSizes: number;
  spacing: number;
  radius: number;
  a11y: RawA11yIssue[];
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const components = componentsScore(input.groups);
  const colors = categoryScore(IDEAL_VARIANTS.colors, input.colorGroups);
  const typography = categoryScore(IDEAL_VARIANTS.fontSizes, input.fontSizes);
  const spacing = categoryScore(IDEAL_VARIANTS.spacing, input.spacing);
  const radius = categoryScore(IDEAL_VARIANTS.radius, input.radius);
  const weighted =
    components * SCORE_WEIGHTS.components +
    colors * SCORE_WEIGHTS.colors +
    typography * SCORE_WEIGHTS.typography +
    spacing * SCORE_WEIGHTS.spacing +
    radius * SCORE_WEIGHTS.radius;
  const penalty = a11yPenalty(input.a11y);
  return {
    overall: Math.max(0, Math.min(100, Math.round(weighted - penalty))),
    components: Math.round(components),
    colors: Math.round(colors),
    typography: Math.round(typography),
    spacing: Math.round(spacing),
    radius: Math.round(radius),
    a11yPenalty: penalty,
  };
}
