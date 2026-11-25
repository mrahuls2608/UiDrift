/**
 * Maps Tailwind CSS utility classes to the CSS declarations they produce, so projects styled with
 * Tailwind are audited the same way as projects with hand-written CSS. Only the base (un-prefixed)
 * state is used: `hover:` / `md:` / `dark:` variants describe other states and are skipped.
 */

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const RAW_PALETTE: Record<string, string> = {
  slate: 'f8fafc f1f5f9 e2e8f0 cbd5e1 94a3b8 64748b 475569 334155 1e293b 0f172a 020617',
  gray: 'f9fafb f3f4f6 e5e7eb d1d5db 9ca3af 6b7280 4b5563 374151 1f2937 111827 030712',
  zinc: 'fafafa f4f4f5 e4e4e7 d4d4d8 a1a1aa 71717a 52525b 3f3f46 27272a 18181b 09090b',
  neutral: 'fafafa f5f5f5 e5e5e5 d4d4d4 a3a3a3 737373 525252 404040 262626 171717 0a0a0a',
  stone: 'fafaf9 f5f5f4 e7e5e4 d6d3d1 a8a29e 78716c 57534e 44403c 292524 1c1917 0c0a09',
  red: 'fef2f2 fee2e2 fecaca fca5a5 f87171 ef4444 dc2626 b91c1c 991b1b 7f1d1d 450a0a',
  orange: 'fff7ed ffedd5 fed7aa fdba74 fb923c f97316 ea580c c2410c 9a3412 7c2d12 431407',
  amber: 'fffbeb fef3c7 fde68a fcd34d fbbf24 f59e0b d97706 b45309 92400e 78350f 451a03',
  yellow: 'fefce8 fef9c3 fef08a fde047 facc15 eab308 ca8a04 a16207 854d0e 713f12 422006',
  lime: 'f7fee7 ecfccb d9f99d bef264 a3e635 84cc16 65a30d 4d7c0f 3f6212 365314 1a2e05',
  green: 'f0fdf4 dcfce7 bbf7d0 86efac 4ade80 22c55e 16a34a 15803d 166534 14532d 052e16',
  emerald: 'ecfdf5 d1fae5 a7f3d0 6ee7b7 34d399 10b981 059669 047857 065f46 064e3b 022c22',
  teal: 'f0fdfa ccfbf1 99f6e4 5eead4 2dd4bf 14b8a6 0d9488 0f766e 115e59 134e4a 042f2e',
  cyan: 'ecfeff cffafe a5f3fc 67e8f9 22d3ee 06b6d4 0891b2 0e7490 155e75 164e63 083344',
  sky: 'f0f9ff e0f2fe bae6fd 7dd3fc 38bdf8 0ea5e9 0284c7 0369a1 075985 0c4a6e 082f49',
  blue: 'eff6ff dbeafe bfdbfe 93c5fd 60a5fa 3b82f6 2563eb 1d4ed8 1e40af 1e3a8a 172554',
  indigo: 'eef2ff e0e7ff c7d2fe a5b4fc 818cf8 6366f1 4f46e5 4338ca 3730a3 312e81 1e1b4b',
  violet: 'f5f3ff ede9fe ddd6fe c4b5fd a78bfa 8b5cf6 7c3aed 6d28d9 5b21b6 4c1d95 2e1065',
  purple: 'faf5ff f3e8ff e9d5ff d8b4fe c084fc a855f7 9333ea 7e22ce 6b21a8 581c87 3b0764',
  fuchsia: 'fdf4ff fae8ff f5d0fe f0abfc e879f9 d946ef c026d3 a21caf 86198f 701a75 4a044e',
  pink: 'fdf2f8 fce7f3 fbcfe8 f9a8d4 f472b6 ec4899 db2777 be185d 9d174d 831843 500724',
  rose: 'fff1f2 ffe4e6 fecdd3 fda4af fb7185 f43f5e e11d48 be123c 9f1239 881337 4c0519',
};

export const TAILWIND_COLORS: Record<string, string> = { white: '#ffffff', black: '#000000' };
for (const [name, list] of Object.entries(RAW_PALETTE)) {
  list.split(' ').forEach((hex, i) => {
    TAILWIND_COLORS[`${name}-${SHADES[i]}`] = `#${hex}`;
  });
}

const FONT_SIZES: Record<string, string> = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',
  '5xl': '48px',
  '6xl': '60px',
  '7xl': '72px',
  '8xl': '96px',
  '9xl': '128px',
};
const RADII: Record<string, string> = {
  none: '0px',
  sm: '2px',
  '': '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
};
const WEIGHTS: Record<string, string> = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};
const SHADOWS: Record<string, string> = {
  sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  '': '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
  none: 'none',
};
const SPACING_PROPS: Record<string, string[]> = {
  p: ['padding'],
  px: ['padding-left', 'padding-right'],
  py: ['padding-top', 'padding-bottom'],
  pt: ['padding-top'],
  pr: ['padding-right'],
  pb: ['padding-bottom'],
  pl: ['padding-left'],
  ps: ['padding-left'],
  pe: ['padding-right'],
  m: ['margin'],
  mx: ['margin-left', 'margin-right'],
  my: ['margin-top', 'margin-bottom'],
  mt: ['margin-top'],
  mr: ['margin-right'],
  mb: ['margin-bottom'],
  ml: ['margin-left'],
  gap: ['gap'],
  'gap-x': ['column-gap'],
  'gap-y': ['row-gap'],
};

function spacing(value: string): string | undefined {
  if (value === 'px') return '1px';
  if (/^\d+(\.\d+)?$/.test(value)) return `${parseFloat(value) * 4}px`;
  return arbitrary(value);
}

function arbitrary(value: string): string | undefined {
  const m = value.match(/^\[(.+)\]$/);
  return m?.[1]?.replace(/_/g, ' ');
}

function withAlpha(hex: string, alpha?: string): string {
  if (!alpha) return hex;
  const a = alpha.startsWith('[') ? parseFloat(arbitrary(alpha) ?? '1') : parseInt(alpha, 10) / 100;
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Number.isFinite(a) ? a : 1})`;
}

/** `blue-500`, `[#123456]`, `white/50` → CSS color, or undefined when not a color. */
function color(value: string): string | undefined {
  const [base = '', alpha] = value.split('/');
  if (TAILWIND_COLORS[base]) return withAlpha(TAILWIND_COLORS[base] as string, alpha);
  const arb = arbitrary(base);
  if (arb && /^(#|rgb|hsl|oklch)/i.test(arb)) return arb;
  if (base === 'transparent') return 'transparent';
  return undefined;
}

const isLength = (v: string) => /^-?\d*\.?\d+(px|rem|em|%)?$/.test(v);

/** Translate one utility class (without variants) into declarations. */
export function tailwindClassToDecls(cls: string): Record<string, string> {
  const c = cls.replace(/^!/, '');
  const spacingMatch = c.match(
    /^(-?)(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-(.+)$/,
  );
  if (spacingMatch) {
    const [, neg, key, val] = spacingMatch as [string, string, string, string];
    const v = spacing(val);
    if (!v || !isLength(v)) return {};
    return Object.fromEntries((SPACING_PROPS[key] ?? []).map((p) => [p, neg ? `-${v}` : v]));
  }
  let m: RegExpMatchArray | null;
  if ((m = c.match(/^text-(.+)$/))) {
    const v = m[1] as string;
    if (FONT_SIZES[v]) return { 'font-size': FONT_SIZES[v] as string };
    const arb = arbitrary(v);
    if (arb && isLength(arb)) return { 'font-size': arb };
    const col = color(v);
    return col ? { color: col } : {};
  }
  if ((m = c.match(/^bg-(.+)$/))) {
    const col = color(m[1] as string);
    return col ? { 'background-color': col } : {};
  }
  if (c === 'border') return { 'border-width': '1px', 'border-style': 'solid' };
  if ((m = c.match(/^border-(\d+|\[[^\]]+\])$/))) {
    const v = /^\d+$/.test(m[1] as string) ? `${m[1]}px` : arbitrary(m[1] as string);
    return v ? { 'border-width': v, 'border-style': 'solid' } : {};
  }
  if ((m = c.match(/^border-(.+)$/))) {
    const col = color(m[1] as string);
    return col ? { 'border-color': col } : {};
  }
  if ((m = c.match(/^rounded(?:-(.+))?$/))) {
    const key = m[1] ?? '';
    if (RADII[key] !== undefined) return { 'border-radius': RADII[key] as string };
    const arb = arbitrary(key);
    return arb ? { 'border-radius': arb } : {};
  }
  if ((m = c.match(/^font-(.+)$/))) {
    const key = m[1] as string;
    if (WEIGHTS[key]) return { 'font-weight': WEIGHTS[key] as string };
    if (key === 'sans' || key === 'serif' || key === 'mono')
      return {
        'font-family': key === 'mono' ? 'monospace' : key === 'serif' ? 'serif' : 'sans-serif',
      };
    const arb = arbitrary(key);
    return arb ? { 'font-family': arb } : {};
  }
  if ((m = c.match(/^shadow(?:-(.+))?$/))) {
    const key = m[1] ?? '';
    if (SHADOWS[key] !== undefined) return { 'box-shadow': SHADOWS[key] as string };
    return {};
  }
  if ((m = c.match(/^leading-\[(.+)\]$/))) return { 'line-height': m[1] as string };
  if (c === 'underline') return { 'text-decoration-line': 'underline' };
  if (c === 'no-underline') return { 'text-decoration-line': 'none' };
  if (c === 'uppercase' || c === 'lowercase' || c === 'capitalize') return { 'text-transform': c };
  if (c === 'outline-none') return { outline: 'none' };
  return {};
}

/** Declarations for a whole class list. `focus:outline-none` etc. are reported separately. */
export function tailwindToDecls(classList: string): {
  decls: Record<string, string>;
  variants: string[];
} {
  const decls: Record<string, string> = {};
  const variants: string[] = [];
  for (const token of classList.split(/\s+/).filter(Boolean)) {
    if (token.includes(':')) {
      variants.push(token);
      continue;
    }
    Object.assign(decls, tailwindClassToDecls(token));
  }
  return { decls, variants };
}
