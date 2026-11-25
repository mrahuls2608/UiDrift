import {
  COMPONENT_TYPES,
  IDEAL_VARIANTS,
  type ColorGroup,
  type ComponentGroup,
  type PageResult,
  type RawA11yIssue,
  type RawElement,
  type ReportDTO,
  type ValueCount,
} from '@uidrift/shared';
import { groupComponents } from './group.js';
import { clusterColors } from './color.js';
import { buildDistributions } from './distribution.js';
import { computeScore } from './score.js';

export type AnalysisResult = Pick<
  ReportDTO,
  | 'score'
  | 'summary'
  | 'componentGroups'
  | 'colors'
  | 'fontSizes'
  | 'fontFamilies'
  | 'spacing'
  | 'radius'
  | 'a11y'
>;

const MAX_GROUPS_PER_TYPE = 40;
const MAX_VALUES = 40;

function dedupeA11y(issues: RawA11yIssue[]): RawA11yIssue[] {
  const seen = new Set<string>();
  const out: RawA11yIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.id}|${issue.page}|${issue.selector}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  return out.sort((a, b) => order[a.impact] - order[b.impact]).slice(0, 200);
}

function capGroups(groups: ComponentGroup[]): ComponentGroup[] {
  return COMPONENT_TYPES.flatMap((t) =>
    groups.filter((g) => g.type === t).slice(0, MAX_GROUPS_PER_TYPE),
  ).map((g) => ({ ...g, pages: g.pages.slice(0, 10) }));
}

function cap<T extends ValueCount | ColorGroup>(list: T[]): T[] {
  return list.slice(0, MAX_VALUES);
}

export interface AnalysisData {
  elements: RawElement[];
  extraStyles?: Record<string, string>[];
  a11y: RawA11yIssue[];
}

/** Pure analysis: raw crawl output → scored, grouped report data. */
export function analyzePages(pages: PageResult[]): AnalysisResult {
  return analyzeData({
    elements: pages.flatMap((p) => p.elements),
    a11y: pages.flatMap((p) => p.a11y),
  });
}

/** Shared by URL crawls and source-code audits: elements + token blocks + a11y → report data. */
export function analyzeData(data: AnalysisData): AnalysisResult {
  const { elements } = data;
  const groups = groupComponents(elements);
  const dist = buildDistributions(elements, data.extraStyles);
  const colors = clusterColors(dist.colorCounts);
  const a11y = dedupeA11y(data.a11y);

  const score = computeScore({
    groups,
    colorGroups: colors.length,
    fontSizes: dist.fontSizes.length,
    spacing: dist.spacing.length,
    radius: dist.radius.length,
    a11y,
  });

  return {
    score,
    summary: {
      components: COMPONENT_TYPES.map((type) => ({
        type,
        variants: groups.filter((g) => g.type === type).length,
        ideal: IDEAL_VARIANTS[type],
      })),
      colors: { actual: colors.length, ideal: IDEAL_VARIANTS.colors },
      fontSizes: { actual: dist.fontSizes.length, ideal: IDEAL_VARIANTS.fontSizes },
      spacing: { actual: dist.spacing.length, ideal: IDEAL_VARIANTS.spacing },
      radius: { actual: dist.radius.length, ideal: IDEAL_VARIANTS.radius },
      a11yIssues: a11y.length,
    },
    componentGroups: capGroups(groups),
    colors: cap(colors).map((c) => ({ ...c, merged: c.merged.slice(0, 20) })),
    fontSizes: cap(dist.fontSizes),
    fontFamilies: cap(dist.fontFamilies),
    spacing: cap(dist.spacing),
    radius: cap(dist.radius),
    a11y,
  };
}
