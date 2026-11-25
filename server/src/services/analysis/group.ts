import {
  IDEAL_VARIANTS,
  type ComponentGroup,
  type ComponentType,
  type RawElement,
} from '@uidrift/shared';
import { FINGERPRINT_KEYS, fingerprintElement, type NormalizedStyles } from './fingerprint.js';
import { colorsMatch } from './color.js';
import { isColorValue, isPxValue, parsePx } from './normalize.js';

export const PX_TOLERANCE = 2;

interface WorkingGroup extends Omit<ComponentGroup, 'pages' | 'suggested'> {
  pages: Set<string>;
}

function valuesMatch(a = '', b = ''): boolean {
  if (a === b) return true;
  if (isPxValue(a) && isPxValue(b)) return Math.abs(parsePx(a) - parsePx(b)) <= PX_TOLERANCE;
  if (isColorValue(a) && isColorValue(b)) return colorsMatch(a, b);
  return false;
}

/** Near-duplicate test: every fingerprint key within 2 px or Delta-E < 3 (TRD §7). */
export function isNearDuplicate(
  type: ComponentType,
  a: NormalizedStyles,
  b: NormalizedStyles,
): boolean {
  return FINGERPRINT_KEYS[type].every((k) => valuesMatch(a[k], b[k]));
}

function exactGroups(elements: RawElement[]): WorkingGroup[] {
  const map = new Map<string, WorkingGroup>();
  for (const el of elements) {
    const { styles, fingerprint } = fingerprintElement(el);
    const key = `${el.type}:${fingerprint}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.pages.add(el.page);
      if (!existing.sampleText && el.text) existing.sampleText = el.text;
    } else {
      map.set(key, {
        type: el.type,
        fingerprint,
        styles,
        count: 1,
        pages: new Set([el.page]),
        sampleText: el.text,
      });
    }
  }
  return [...map.values()];
}

/** Exact fingerprint grouping, then near-duplicate merging into the more used group. */
export function groupComponents(elements: RawElement[]): ComponentGroup[] {
  const sorted = exactGroups(elements).sort((a, b) => b.count - a.count);
  const merged: WorkingGroup[] = [];
  for (const group of sorted) {
    const target = merged.find(
      (m) => m.type === group.type && isNearDuplicate(group.type, m.styles, group.styles),
    );
    if (target) {
      target.count += group.count;
      group.pages.forEach((p) => target.pages.add(p));
      if (!target.sampleText) target.sampleText = group.sampleText;
    } else {
      merged.push({ ...group, pages: new Set(group.pages) });
    }
  }

  const rank = new Map<ComponentType, number>();
  return merged
    .sort((a, b) => b.count - a.count)
    .map((g) => {
      const position = rank.get(g.type) ?? 0;
      rank.set(g.type, position + 1);
      return {
        type: g.type,
        fingerprint: g.fingerprint,
        styles: g.styles,
        count: g.count,
        pages: [...g.pages],
        sampleText: g.sampleText,
        suggested: position < IDEAL_VARIANTS[g.type],
      };
    });
}
