import type { RawElement, ValueCount } from '@uidrift/shared';
import { normalizeStyles } from './fingerprint.js';
import { TRANSPARENT, parsePx, roundPx } from './normalize.js';

export function countValues(values: Iterable<string>): ValueCount[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || parsePx(a.value) - parsePx(b.value));
}

export interface Distributions {
  colorCounts: Map<string, number>;
  fontSizes: ValueCount[];
  fontFamilies: ValueCount[];
  spacing: ValueCount[];
  radius: ValueCount[];
}

const SPACING_PROPS = [
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
] as const;

/**
 * Token-level sprawl: colors, font sizes and families, spacing and radius values.
 * `extraStyles` are style blocks that aren't components (source audits) — they count for tokens too.
 */
export function buildDistributions(
  elements: RawElement[],
  extraStyles: Record<string, string>[] = [],
): Distributions {
  const colorCounts = new Map<string, number>();
  const fontSizes: string[] = [];
  const fontFamilies: string[] = [];
  const spacing: string[] = [];
  const radius: string[] = [];
  const addColor = (hex: string) => {
    if (hex !== TRANSPARENT && hex.startsWith('#'))
      colorCounts.set(hex, (colorCounts.get(hex) ?? 0) + 1);
  };

  const all: Array<{ type: string; styles: Record<string, string> }> = [
    ...elements,
    ...extraStyles.map((styles) => ({ type: 'style', styles })),
  ];
  for (const el of all) {
    const s = normalizeStyles(el.styles);
    // Source blocks only list what they set; skip values that weren't authored.
    addColor(s.color ?? TRANSPARENT);
    addColor(s.bg ?? TRANSPARENT);
    if (s.border !== 'none') addColor(s.borderColor ?? TRANSPARENT);
    if (el.type !== 'card' && el.styles.fontSize !== undefined) fontSizes.push(s.fontSize ?? '0px');
    if (el.type !== 'card' && el.styles.fontFamily !== undefined)
      fontFamilies.push(s.fontFamily ?? 'inherit');
    for (const prop of SPACING_PROPS) {
      const px = parsePx(el.styles[prop]);
      if (px > 0) spacing.push(roundPx(px));
    }
    if (el.styles.borderTopLeftRadius !== undefined && s.radius && s.radius !== '0px')
      radius.push(s.radius);
  }

  return {
    colorCounts,
    fontSizes: countValues(fontSizes),
    fontFamilies: countValues(fontFamilies),
    spacing: countValues(spacing),
    radius: countValues(radius),
  };
}
