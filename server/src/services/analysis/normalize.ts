import { formatHex, formatHex8, parse } from 'culori';

export const TRANSPARENT = 'transparent';

/** Any CSS color → lowercase hex (#rrggbb, or #rrggbbaa when translucent). */
export function toHex(value: string | undefined): string {
  if (!value) return TRANSPARENT;
  const color = parse(value.trim());
  if (!color) return TRANSPARENT;
  const alpha = color.alpha ?? 1;
  if (alpha === 0) return TRANSPARENT;
  return (alpha < 1 ? formatHex8(color) : formatHex(color)).toLowerCase();
}

export function parsePx(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Round a px value to the nearest `step` px (TRD §7: nearest 2 px). */
export function roundPx(value: string | number | undefined, step = 2): string {
  const n = typeof value === 'number' ? value : parsePx(value);
  const rounded = Math.round(n / step) * step;
  return `${rounded === 0 ? 0 : rounded}px`;
}

export function normalizeWeight(value: string | undefined): string {
  if (!value) return '400';
  if (value === 'normal') return '400';
  if (value === 'bold') return '700';
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? String(Math.round(n / 100) * 100) : '400';
}

export function primaryFontFamily(value: string | undefined): string {
  if (!value) return 'inherit';
  const first = value.split(',')[0] ?? '';
  return first.replace(/["']/g, '').trim().toLowerCase() || 'inherit';
}

/** Collapse a box-shadow into a stable string with hex colors. */
export function normalizeShadow(value: string | undefined): string {
  if (!value || value === 'none') return 'none';
  return value
    .replace(/rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8}\b/gi, (c) => toHex(c))
    .replace(/(-?\d*\.?\d+)px/g, (_m, n: string) => roundPx(parseFloat(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeBorder(width?: string, style?: string, color?: string): string {
  const w = parsePx(width);
  if (w === 0 || !style || style === 'none' || style === 'hidden') return 'none';
  const hex = toHex(color);
  if (hex === TRANSPARENT) return 'none';
  return `${roundPx(w, 1)} ${style} ${hex}`;
}

export function isColorValue(v: string): boolean {
  return v.startsWith('#');
}

export function isPxValue(v: string): boolean {
  return /^-?\d+(\.\d+)?px$/.test(v);
}
