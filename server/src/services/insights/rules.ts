import { converter } from 'culori';
import {
  COMPONENT_TYPES,
  IDEAL_VARIANTS,
  scoreLabel,
  type ComponentGroup,
  type ComponentType,
  type InsightRecommendation,
  type InsightTokenName,
  type Insights,
  type RawA11yIssue,
} from '@uidrift/shared';
import type { AnalysisResult } from '../analysis/index.js';
import { deltaE } from '../analysis/color.js';
import { parsePx } from '../analysis/normalize.js';

/**
 * Deterministic insights — no AI. Every recommendation is computed from the audit data, so the
 * same project always gets the same advice. An optional LLM may rephrase these, never replace them.
 */

const NAMES: Record<ComponentType, [string, string]> = {
  button: ['button', 'buttons'],
  input: ['input', 'inputs'],
  heading: ['heading', 'headings'],
  link: ['link', 'links'],
  card: ['card', 'cards'],
};
const IMPACT_ORDER = { high: 0, medium: 1, low: 2 } as const;
const MAX_RECOMMENDATIONS = 10;

function describe(g: ComponentGroup): string {
  const s = g.styles;
  if (g.type === 'heading') return `${s.fontSize} / ${s.fontWeight}`;
  if (g.type === 'link')
    return `${s.color}${s.textDecoration && s.textDecoration !== 'none' ? ' underlined' : ''}`;
  const bg = s.bg && s.bg !== 'transparent' ? s.bg : 'no background';
  return `${bg}, radius ${s.radius}, padding ${s.paddingY} ${s.paddingX}`;
}

function impactFor(actual: number, ideal: number): InsightRecommendation['impact'] {
  if (actual >= ideal * 2) return 'high';
  return actual > ideal ? 'medium' : 'low';
}

function componentRecs(a: AnalysisResult): InsightRecommendation[] {
  const recs: InsightRecommendation[] = [];
  for (const type of COMPONENT_TYPES) {
    const groups = a.componentGroups.filter((g) => g.type === type);
    const ideal = IDEAL_VARIANTS[type];
    if (groups.length <= ideal) continue;
    const keep = groups.slice(0, ideal);
    const rest = groups.slice(ideal);
    const usages = rest.reduce((n, g) => n + g.count, 0);
    recs.push({
      category: 'components',
      impact: impactFor(groups.length, ideal),
      title: `Consolidate ${groups.length} ${NAMES[type][1]} into ${ideal}`,
      detail: `Keep the ${ideal} most used ${NAMES[type][1]} as your standard (${keep.map(describe).join('; ')}) and migrate ${usages} usage${usages === 1 ? '' : 's'} from the other ${rest.length} variant${rest.length === 1 ? '' : 's'}.`,
    });
  }
  return recs;
}

function nearestPx(value: string, targets: string[]): string {
  const v = parsePx(value);
  return (
    [...targets].sort((x, y) => Math.abs(parsePx(x) - v) - Math.abs(parsePx(y) - v))[0] ?? value
  );
}

function snapList(values: string[], keep: string[], max = 6): string {
  return values
    .slice(0, max)
    .map((v) => `${v} → ${nearestPx(v, keep)}`)
    .join(', ');
}

function tokenRecs(a: AnalysisResult): InsightRecommendation[] {
  const recs: InsightRecommendation[] = [];
  const merged = a.colors.filter((c) => c.merged.length > 1);
  if (merged.length) {
    recs.push({
      category: 'colors',
      impact: 'medium',
      title: `Merge ${merged.reduce((n, c) => n + c.merged.length - 1, 0)} near-identical colors`,
      detail: `These shades are indistinguishable (ΔE < 3): ${merged
        .slice(0, 4)
        .map((c) => `${c.merged.filter((m) => m !== c.hex).join(', ')} → ${c.hex}`)
        .join('; ')}.`,
    });
  }
  const { colors, fontSizes, spacing, radius } = a.summary;
  if (colors.actual > colors.ideal) {
    const keep = a.colors.slice(0, colors.ideal).map((c) => c.hex);
    const drop = a.colors.slice(colors.ideal);
    const mapping = drop
      .slice(0, 5)
      .map((c) => `${c.hex} → ${[...keep].sort((x, y) => deltaE(c.hex, x) - deltaE(c.hex, y))[0]}`)
      .join(', ');
    recs.push({
      category: 'colors',
      impact: impactFor(colors.actual, colors.ideal),
      title: `Trim the palette from ${colors.actual} to ${colors.ideal} colors`,
      detail: `Replace the least used colors with their closest kept color: ${mapping}.`,
    });
  }
  if (fontSizes.actual > fontSizes.ideal) {
    const keep = a.fontSizes.slice(0, fontSizes.ideal).map((f) => f.value);
    recs.push({
      category: 'typography',
      impact: impactFor(fontSizes.actual, fontSizes.ideal),
      title: `Reduce font sizes from ${fontSizes.actual} to ${fontSizes.ideal}`,
      detail: `Snap the outliers to the type scale: ${snapList(
        a.fontSizes.slice(fontSizes.ideal).map((f) => f.value),
        keep,
      )}.`,
    });
  }
  const offGrid = a.spacing.filter((s) => parsePx(s.value) % 4 !== 0).map((s) => s.value);
  if (spacing.actual > spacing.ideal || offGrid.length) {
    const grid = offGrid
      .map((v) => `${v} → ${Math.round(parsePx(v) / 4) * 4}px`)
      .slice(0, 6)
      .join(', ');
    recs.push({
      category: 'spacing',
      impact: impactFor(spacing.actual, spacing.ideal),
      title: `Move spacing onto a 4 px grid (${spacing.actual} values → ${spacing.ideal})`,
      detail: offGrid.length
        ? `Off-grid values: ${grid}. Then keep ${a.spacing
            .slice(0, spacing.ideal)
            .map((s) => s.value)
            .join(', ')} as your spacing scale.`
        : `Keep ${a.spacing
            .slice(0, spacing.ideal)
            .map((s) => s.value)
            .join(', ')} as your spacing scale.`,
    });
  }
  if (radius.actual > radius.ideal) {
    const keep = a.radius.slice(0, radius.ideal).map((r) => r.value);
    recs.push({
      category: 'radius',
      impact: impactFor(radius.actual, radius.ideal),
      title: `Standardize border radius (${radius.actual} values → ${radius.ideal})`,
      detail: `Keep ${keep.join(', ')}; snap ${snapList(
        a.radius.slice(radius.ideal).map((r) => r.value),
        keep,
      )}.`,
    });
  }
  return recs;
}

function a11yRecs(issues: RawA11yIssue[]): InsightRecommendation[] {
  const groups = new Map<string, RawA11yIssue[]>();
  for (const i of issues) groups.set(i.id, [...(groups.get(i.id) ?? []), i]);
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  return [...groups.values()]
    .sort((x, y) => order[x[0]!.impact] - order[y[0]!.impact] || y.length - x.length)
    .slice(0, 4)
    .map((list) => {
      const first = list[0]!;
      const where = list
        .slice(0, 3)
        .map((i) => i.page)
        .join(', ');
      return {
        category: 'accessibility' as const,
        impact:
          first.impact === 'critical' || first.impact === 'serious'
            ? ('high' as const)
            : ('medium' as const),
        title: `Fix ${list.length} × “${first.help}”`,
        detail: `${first.description}. Start with ${where}${list.length > 3 ? ` and ${list.length - 3} more` : ''}.`,
      };
    });
}

const toHsl = converter('hsl');

/** Suggest semantic names for the kept palette from hue, saturation and lightness. */
export function nameTokens(a: AnalysisResult): InsightTokenName[] {
  const used = new Set<string>();
  const unique = (name: string) => {
    let n = name;
    for (let i = 2; used.has(n); i++) n = `${name}-${i}`;
    used.add(n);
    return n;
  };
  const out: InsightTokenName[] = [];
  const primary = a.componentGroups.find(
    (g) => g.type === 'button' && g.styles.bg?.startsWith('#') && g.styles.bg.length === 7,
  )?.styles.bg;
  if (primary)
    out.push({
      value: primary,
      name: unique('primary'),
      reason: 'Background of the most used button',
    });
  for (const c of a.colors.slice(0, IDEAL_VARIANTS.colors)) {
    if (c.hex === primary || c.hex.length !== 7) continue;
    const hsl = toHsl(c.hex);
    if (!hsl) continue;
    const s = hsl.s ?? 0;
    const l = hsl.l ?? 0;
    const h = hsl.h ?? 0;
    let name: string;
    let reason: string;
    if (s < 0.15 || l > 0.97 || l < 0.08) {
      if (l > 0.95) [name, reason] = ['background', 'Lightest neutral'];
      else if (l > 0.82) [name, reason] = ['border', 'Light neutral, typical for dividers'];
      else if (l > 0.45) [name, reason] = ['text-muted', 'Mid neutral for secondary text'];
      else [name, reason] = ['text', 'Dark neutral for body text'];
    } else if (h >= 345 || h < 15) [name, reason] = ['danger', 'Red hue'];
    else if (h < 65) [name, reason] = ['warning', 'Orange / amber hue'];
    else if (h < 170) [name, reason] = ['success', 'Green hue'];
    else if (h < 255) [name, reason] = [primary ? 'info' : 'primary', 'Blue hue'];
    else [name, reason] = ['accent', 'Violet / purple hue'];
    out.push({ value: c.hex, name: unique(name), reason });
  }
  return out;
}

export interface InsightContext {
  target: string;
}

export function buildRuleInsights(a: AnalysisResult, ctx: InsightContext): Insights {
  const recommendations = [...componentRecs(a), ...tokenRecs(a), ...a11yRecs(a.a11y)]
    .sort((x, y) => IMPACT_ORDER[x.impact] - IMPACT_ORDER[y.impact])
    .slice(0, MAX_RECOMMENDATIONS);

  const gaps = [
    ...a.summary.components.map((c) => ({
      label: NAMES[c.type][1],
      actual: c.variants,
      ideal: c.ideal,
    })),
    { label: 'colors', ...a.summary.colors },
    { label: 'font sizes', ...a.summary.fontSizes },
    { label: 'spacing values', ...a.summary.spacing },
    { label: 'border radii', ...a.summary.radius },
  ]
    .filter((g) => g.actual > g.ideal)
    .sort((x, y) => y.actual / y.ideal - x.actual / x.ideal)
    .slice(0, 3);
  const critical = a.a11y.filter((i) => i.impact === 'critical').length;
  const parts = [`${ctx.target} scores ${a.score.overall}/100 (${scoreLabel(a.score.overall)}).`];
  parts.push(
    gaps.length
      ? `Biggest gaps: ${gaps.map((g) => `${g.label} (${g.actual} → ${g.ideal})`).join(', ')}.`
      : 'Every category is within its ideal variant count.',
  );
  if (a.a11y.length)
    parts.push(
      `${a.a11y.length} accessibility issue${a.a11y.length === 1 ? '' : 's'}${critical ? ` (${critical} critical)` : ''}.`,
    );

  return { engine: 'rules', summary: parts.join(' '), recommendations, tokenNames: nameTokens(a) };
}
