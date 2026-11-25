import type { ComponentType, RawElement } from '@uidrift/shared';
import {
  normalizeBorder,
  normalizeShadow,
  normalizeWeight,
  parsePx,
  primaryFontFamily,
  roundPx,
  toHex,
} from './normalize.js';

/** Style keys that define each component's fingerprint (TRD §7). */
export const FINGERPRINT_KEYS: Record<ComponentType, string[]> = {
  button: [
    'bg',
    'color',
    'fontSize',
    'fontWeight',
    'paddingY',
    'paddingX',
    'radius',
    'border',
    'shadow',
  ],
  input: ['bg', 'color', 'fontSize', 'paddingY', 'paddingX', 'radius', 'border', 'shadow'],
  heading: ['fontFamily', 'fontSize', 'fontWeight', 'color'],
  link: ['color', 'fontSize', 'fontWeight', 'textDecoration'],
  card: ['bg', 'radius', 'border', 'shadow', 'paddingY', 'paddingX'],
};

export type NormalizedStyles = Record<string, string>;

/** Every normalized property, used for previews, distributions and code generation. */
export function normalizeStyles(raw: Record<string, string>): NormalizedStyles {
  const s = raw;
  return {
    bg: toHex(s.backgroundColor),
    color: toHex(s.color),
    fontFamily: primaryFontFamily(s.fontFamily),
    fontSize: roundPx(s.fontSize),
    fontWeight: normalizeWeight(s.fontWeight),
    lineHeight: s.lineHeight === 'normal' || !s.lineHeight ? 'normal' : roundPx(s.lineHeight),
    paddingY: roundPx((parsePx(s.paddingTop) + parsePx(s.paddingBottom)) / 2),
    paddingX: roundPx((parsePx(s.paddingLeft) + parsePx(s.paddingRight)) / 2),
    radius: roundPx(s.borderTopLeftRadius),
    border: normalizeBorder(s.borderTopWidth, s.borderTopStyle, s.borderTopColor),
    borderColor: toHex(s.borderTopColor),
    shadow: normalizeShadow(s.boxShadow),
    textDecoration:
      s.textDecorationLine && s.textDecorationLine !== 'none' ? s.textDecorationLine : 'none',
    textTransform: s.textTransform && s.textTransform !== 'none' ? s.textTransform : 'none',
  };
}

export function fingerprintOf(type: ComponentType, styles: NormalizedStyles): string {
  return FINGERPRINT_KEYS[type].map((k) => `${k}=${styles[k] ?? ''}`).join('|');
}

export function fingerprintElement(el: RawElement): {
  styles: NormalizedStyles;
  fingerprint: string;
} {
  const styles = normalizeStyles(el.styles);
  return { styles, fingerprint: fingerprintOf(el.type, styles) };
}
