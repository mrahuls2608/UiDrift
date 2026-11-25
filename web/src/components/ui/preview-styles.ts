import type { CSSProperties } from 'react';

const HEX = /^#[0-9a-f]{3,8}$/i;
const PX = /^-?\d+(\.\d+)?px$/;
const SHADOW = /^[#0-9a-z .,()-]+$/i;
const BORDER =
  /^\d+(\.\d+)?px (solid|dashed|dotted|double|groove|ridge|inset|outset) #[0-9a-f]{3,8}$/i;
const FAMILY = /^[a-z0-9 -]+$/i;

export const safeColor = (v?: string) =>
  v && (HEX.test(v) || v === 'transparent') ? v : undefined;
const safePx = (v?: string) => (v && PX.test(v) ? v : undefined);

/**
 * Captured styles come from third-party sites, so they are applied only as an allow-listed
 * inline style object with validated values — never as raw CSS or HTML (TRD §9).
 */
export function toPreviewStyle(styles: Record<string, string>): CSSProperties {
  const shadow =
    styles.shadow &&
    styles.shadow !== 'none' &&
    SHADOW.test(styles.shadow) &&
    !/url|expression/i.test(styles.shadow);
  const py = safePx(styles.paddingY);
  const px = safePx(styles.paddingX);
  return {
    backgroundColor: safeColor(styles.bg),
    color: safeColor(styles.color),
    fontSize: safePx(styles.fontSize),
    fontWeight:
      styles.fontWeight && /^\d{3}$/.test(styles.fontWeight)
        ? Number(styles.fontWeight)
        : undefined,
    fontFamily:
      styles.fontFamily && FAMILY.test(styles.fontFamily)
        ? `"${styles.fontFamily}", sans-serif`
        : undefined,
    padding: py && px ? `${py} ${px}` : undefined,
    borderRadius: safePx(styles.radius),
    border: styles.border && BORDER.test(styles.border) ? styles.border : 'none',
    boxShadow: shadow ? styles.shadow : undefined,
    textDecoration:
      styles.textDecoration && /^[a-z -]+$/.test(styles.textDecoration)
        ? styles.textDecoration
        : undefined,
    textTransform: (['uppercase', 'lowercase', 'capitalize'] as const).find(
      (t) => t === styles.textTransform,
    ),
  };
}
