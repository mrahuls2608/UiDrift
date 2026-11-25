import { differenceCiede2000, parse } from 'culori';
import type { ColorGroup } from '@uidrift/shared';
import { TRANSPARENT } from './normalize.js';

const ciede2000 = differenceCiede2000();
export const COLOR_MERGE_THRESHOLD = 3;

/** CIEDE2000 distance between two hex colors (alpha ignored). */
export function deltaE(a: string, b: string): number {
  if (a === b) return 0;
  const ca = parse(a.slice(0, 7));
  const cb = parse(b.slice(0, 7));
  if (!ca || !cb) return Number.POSITIVE_INFINITY;
  return ciede2000(ca, cb);
}

/** True when both colors are equal or perceptually near-identical. */
export function colorsMatch(a: string, b: string, threshold = COLOR_MERGE_THRESHOLD): boolean {
  if (a === b) return true;
  if (a === TRANSPARENT || b === TRANSPARENT) return false;
  if (a.length !== b.length) return false; // opaque vs translucent
  return deltaE(a, b) < threshold;
}

/**
 * Greedy clustering: colors are visited from most to least used, and each joins the first
 * existing cluster whose representative is within the Delta-E threshold. The representative
 * is therefore always the most used hex of its cluster.
 */
export function clusterColors(
  counts: Map<string, number>,
  threshold = COLOR_MERGE_THRESHOLD,
): ColorGroup[] {
  const sorted = [...counts.entries()]
    .filter(([hex]) => hex !== TRANSPARENT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const groups: ColorGroup[] = [];
  for (const [hex, count] of sorted) {
    const target = groups.find((g) => colorsMatch(g.hex, hex, threshold));
    if (target) {
      target.count += count;
      target.merged.push(hex);
    } else {
      groups.push({ hex, merged: [hex], count });
    }
  }
  return groups.sort((a, b) => b.count - a.count);
}
