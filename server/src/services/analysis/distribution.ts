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

/** Token-level sprawl: colors, font sizes and families, spacing and radius values. */
export function buildDistributions(elements: RawElement[]): Distributions {
  const colorCounts = new Map<string, number>();
  const fontSizes: string[] = [];
  const fontFamilies: string[] = [];
  const spacing: string[] = [];
  const radius: string[] = [];
  const addColor = (hex: string) => {
    if (hex !== TRANSPARENT) colorCounts.set(hex, (colorCounts.get(hex) ?? 0) + 1);
  };

  for (const el of elements) {
    const s = normalizeStyles(el.styles);
    addColor(s.color ?? TRANSPARENT);
    addColor(s.bg ?? TRANSPARENT);
    if (s.border !== 'none') addColor(s.borderColor ?? TRANSPARENT);
    if (el.type !== 'card') {
      fontSizes.push(s.fontSize ?? '0px');
      fontFamilies.push(s.fontFamily ?? 'inherit');
    }
    for (const prop of SPACING_PROPS) {
      const px = parsePx(el.styles[prop]);
      if (px > 0) spacing.push(roundPx(px));
    }
    if (s.radius && s.radius !== '0px') radius.push(s.radius);
  }

  return {
    colorCounts,
    fontSizes: countValues(fontSizes),
    fontFamilies: countValues(fontFamilies),
    spacing: countValues(spacing),
    radius: countValues(radius),
  };
}
