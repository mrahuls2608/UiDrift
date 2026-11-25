/**
 * Turns authored CSS declarations (shorthands, rem/em, keywords) into the same computed-style keys
 * the browser crawler captures (`backgroundColor`, `paddingTop`, `borderTopWidth`, ...), so source
 * audits flow through the exact same fingerprint, grouping and scoring code as URL audits.
 */

const ROOT_PX = 16;
const NAMED_SIZES: Record<string, number> = {
  'xx-small': 9,
  'x-small': 10,
  small: 13,
  medium: 16,
  large: 18,
  'x-large': 24,
  'xx-large': 32,
};
const BORDER_STYLES = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'none',
  'hidden',
]);

const isUnresolved = (v: string) =>
  /var\(|[$@][\w-]|calc\(|clamp\(|min\(|max\(|__interp__|\{|\}/.test(v);

/** `1.5rem` → `24px`; unitless numbers are px. Returns undefined for values we can't evaluate. */
export function toPx(raw: string | undefined, base = ROOT_PX): string | undefined {
  if (raw === undefined) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === '0' || v === 'none' || v === 'auto') return v === 'auto' ? undefined : '0px';
  if (NAMED_SIZES[v]) return `${NAMED_SIZES[v]}px`;
  const m = v.match(/^(-?\d*\.?\d+)(px|rem|em|pt)?$/);
  if (!m) return undefined;
  const n = parseFloat(m[1] as string);
  const unit = m[2] ?? 'px';
  const px = unit === 'rem' || unit === 'em' ? n * base : unit === 'pt' ? (n * 4) / 3 : n;
  return `${Math.round(px * 100) / 100}px`;
}

function splitValues(v: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of v.trim()) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function boxSides(v: string): [string?, string?, string?, string?] {
  const p = splitValues(v).map((x) => toPx(x));
  const [t, r = t, b = t, l = r] = p;
  return [t, r, b, l];
}

const looksLikeColor = (v: string) =>
  /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|lab\(|lch\(|color\(|transparent$|currentcolor$|[a-z]+$)/i.test(
    v,
  );

function parseBorder(v: string) {
  const out: { width?: string; style?: string; color?: string } = {};
  for (const part of splitValues(v)) {
    const lower = part.toLowerCase();
    if (BORDER_STYLES.has(lower)) out.style = lower;
    else if (toPx(part)) out.width = toPx(part);
    else if (['thin', 'medium', 'thick'].includes(lower))
      out.width = { thin: '1px', medium: '3px', thick: '5px' }[lower];
    else if (looksLikeColor(part)) out.color = part;
  }
  if (out.style && !out.width) out.width = '3px';
  return out;
}

function parseFont(v: string, out: Record<string, string>) {
  const m = v.match(
    /(?:^|\s)(\d*\.?\d+(?:px|rem|em|pt)|xx-small|x-small|small|medium|large|x-large|xx-large)(?:\s*\/\s*([^\s]+))?\s+(.+)$/i,
  );
  if (!m) return;
  const size = toPx(m[1]);
  if (size) out.fontSize = size;
  if (m[2]) out.lineHeight = toPx(m[2]) ?? m[2];
  out.fontFamily = (m[3] as string).trim();
  const weight = v.match(/(?:^|\s)(bold|bolder|lighter|[1-9]00)(?:\s|$)/i);
  if (weight) out.fontWeight = weight[1] as string;
}

/** Convert one rule's authored declarations to computed-style keys. Unresolvable values are dropped. */
export function expandDecls(decls: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const set = (key: string, value: string | undefined) => {
    if (value !== undefined && value !== '' && !isUnresolved(value)) out[key] = value;
  };
  for (const [prop, rawValue] of Object.entries(decls)) {
    const value = rawValue.trim();
    if (isUnresolved(value)) continue;
    switch (prop) {
      case 'color':
        set('color', value);
        break;
      case 'background-color':
        set('backgroundColor', value);
        break;
      case 'background': {
        const first = splitValues(value).find(
          (p) =>
            looksLikeColor(p) &&
            !/^(none|no-repeat|repeat|center|top|left|right|bottom|fixed|scroll|cover|contain)$/i.test(
              p,
            ),
        );
        if (first && !/gradient|url\(/i.test(value)) set('backgroundColor', first);
        break;
      }
      case 'font-size':
        set('fontSize', toPx(value));
        break;
      case 'font-weight':
        set('fontWeight', value);
        break;
      case 'font-family':
        set('fontFamily', value);
        break;
      case 'line-height':
        set('lineHeight', toPx(value) ?? value);
        break;
      case 'font':
        parseFont(value, out);
        break;
      case 'padding':
      case 'margin': {
        const [t, r, b, l] = boxSides(value);
        const k = prop === 'padding' ? 'padding' : 'margin';
        set(`${k}Top`, t);
        set(`${k}Right`, r);
        set(`${k}Bottom`, b);
        set(`${k}Left`, l);
        break;
      }
      case 'padding-inline':
      case 'margin-inline':
      case 'padding-block':
      case 'margin-block': {
        const [a, c = a] = splitValues(value).map((x) => toPx(x));
        const k = prop.startsWith('padding') ? 'padding' : 'margin';
        if (prop.endsWith('inline')) {
          set(`${k}Left`, a);
          set(`${k}Right`, c);
        } else {
          set(`${k}Top`, a);
          set(`${k}Bottom`, c);
        }
        break;
      }
      case 'border':
      case 'border-top': {
        const b = parseBorder(value);
        set('borderTopWidth', b.width ?? (b.style === 'none' ? '0px' : undefined));
        set('borderTopStyle', b.style ?? (b.width ? 'solid' : undefined));
        set('borderTopColor', b.color ?? (b.width ? 'currentcolor' : undefined));
        break;
      }
      case 'border-width':
        set('borderTopWidth', toPx(splitValues(value)[0]));
        break;
      case 'border-top-width':
        set('borderTopWidth', toPx(value));
        break;
      case 'border-style':
        set('borderTopStyle', splitValues(value)[0]);
        break;
      case 'border-top-style':
        set('borderTopStyle', value);
        break;
      case 'border-color':
        set('borderTopColor', splitValues(value)[0]);
        break;
      case 'border-top-color':
        set('borderTopColor', value);
        break;
      case 'border-radius':
      case 'border-top-left-radius':
        set('borderTopLeftRadius', toPx(splitValues(value.split('/')[0] ?? '')[0]));
        break;
      case 'box-shadow':
        set('boxShadow', value);
        break;
      case 'text-decoration':
      case 'text-decoration-line':
        set('textDecorationLine', splitValues(value)[0]);
        break;
      case 'text-transform':
        set('textTransform', value);
        break;
      default: {
        const side = prop.match(/^(padding|margin)-(top|right|bottom|left)$/);
        if (side)
          set(
            `${side[1]}${(side[2] as string)[0]?.toUpperCase()}${(side[2] as string).slice(1)}`,
            toPx(value),
          );
      }
    }
  }
  if (out.borderTopColor === 'currentcolor' && out.color) out.borderTopColor = out.color;
  if (out.borderTopColor === 'currentcolor') delete out.borderTopColor;
  return out;
}

/** camelCase JS style keys (`backgroundColor`) → CSS property names (`background-color`). */
export function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^ms-/, '-ms-');
}

const UNITLESS = new Set([
  'font-weight',
  'line-height',
  'opacity',
  'z-index',
  'flex',
  'flex-grow',
  'flex-shrink',
  'order',
]);

/** React inline style values: numbers become px except for unitless properties. */
export function jsValueToCss(prop: string, value: string | number): string {
  if (typeof value === 'number') return UNITLESS.has(prop) ? String(value) : `${value}px`;
  return value;
}
