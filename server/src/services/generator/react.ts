import type { ComponentGroup, GeneratedFile } from '@uidrift/shared';
import { parsePx } from '../analysis/normalize.js';
import { tokenLookup, type TokenSet } from './tokens.js';

type StyleMap = Record<string, string>;
const VARIANT_NAMES = ['primary', 'secondary', 'tertiary'];
const SAFE = /^[#a-z0-9 .,%()-]+$/i;

function valueOf(
  lookup: ReturnType<typeof tokenLookup>,
  raw: string | undefined,
): string | undefined {
  if (!raw || raw === 'none' || raw === 'transparent' || !SAFE.test(raw)) return undefined;
  return lookup(raw) ?? raw;
}

function toCss(styles: StyleMap, lookup: ReturnType<typeof tokenLookup>): StyleMap {
  const out: StyleMap = {};
  const set = (key: string, raw: string | undefined) => {
    const v = valueOf(lookup, raw);
    if (v) out[key] = v;
  };
  set('backgroundColor', styles.bg);
  set('color', styles.color);
  set('fontSize', styles.fontSize);
  if (styles.fontWeight && styles.fontWeight !== '400') out.fontWeight = styles.fontWeight;
  if (
    styles.paddingY &&
    styles.paddingX &&
    (parsePx(styles.paddingY) || parsePx(styles.paddingX))
  ) {
    out.padding = `${valueOf(lookup, styles.paddingY)} ${valueOf(lookup, styles.paddingX)}`;
  }
  set('borderRadius', styles.radius === '0px' ? undefined : styles.radius);
  if (styles.border && styles.border !== 'none' && SAFE.test(styles.border)) {
    const [w, s, c] = styles.border.split(' ');
    out.border = `${w} ${s} ${lookup(c) ?? c}`;
  } else if (styles.border === 'none') {
    out.border = 'none';
  }
  set('boxShadow', styles.shadow);
  if (styles.textDecoration && styles.textDecoration !== 'none')
    out.textDecoration = styles.textDecoration;
  return out;
}

const literal = (obj: StyleMap, indent = 2) =>
  JSON.stringify(obj, null, 2)
    .split('\n')
    .join(`\n${' '.repeat(indent)}`);

function topOf(groups: ComponentGroup[], type: ComponentGroup['type'], n: number) {
  return groups.filter((g) => g.type === type).slice(0, n);
}

function buttonFile(
  groups: ComponentGroup[],
  lookup: ReturnType<typeof tokenLookup>,
): GeneratedFile {
  const top = topOf(groups, 'button', 3);
  const variants = Object.fromEntries(
    (top.length ? top : [undefined]).map((g, i) => [
      VARIANT_NAMES[i],
      g ? toCss(g.styles, lookup) : {},
    ]),
  );
  const names = Object.keys(variants);
  return {
    path: 'components/Button.tsx',
    content: `import type { ButtonHTMLAttributes, CSSProperties } from 'react';

export type ButtonVariant = ${names.map((n) => `'${n}'`).join(' | ')};

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5em',
  cursor: 'pointer',
  fontFamily: 'var(--font-family-base, inherit)',
  lineHeight: 1.2,
};

const variants: Record<ButtonVariant, CSSProperties> = ${literal(variants as Record<string, never>, 0)};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = '${names[0]}', style, type = 'button', ...props }: ButtonProps) {
  return <button type={type} style={{ ...base, ...variants[variant], ...style }} {...props} />;
}
`,
  };
}

function inputFile(
  groups: ComponentGroup[],
  lookup: ReturnType<typeof tokenLookup>,
): GeneratedFile {
  const g = topOf(groups, 'input', 1)[0];
  return {
    path: 'components/Input.tsx',
    content: `import { forwardRef, type CSSProperties, type InputHTMLAttributes } from 'react';

const inputStyle: CSSProperties = ${literal({ fontFamily: 'var(--font-family-base, inherit)', ...(g ? toCss(g.styles, lookup) : {}) }, 0)};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, style, ...props },
  ref,
) {
  const field = <input ref={ref} id={id} style={{ ...inputStyle, ...style }} {...props} />;
  if (!label) return field;
  return (
    <label htmlFor={id} style={{ display: 'grid', gap: '0.25rem' }}>
      <span>{label}</span>
      {field}
    </label>
  );
});
`,
  };
}

function cardFile(groups: ComponentGroup[], lookup: ReturnType<typeof tokenLookup>): GeneratedFile {
  const g = topOf(groups, 'card', 1)[0];
  return {
    path: 'components/Card.tsx',
    content: `import type { CSSProperties, HTMLAttributes } from 'react';

const cardStyle: CSSProperties = ${literal(g ? toCss(g.styles, lookup) : { padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }, 0)};

export function Card({ style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div style={{ ...cardStyle, ...style }} {...props} />;
}
`,
  };
}

function headingFile(
  groups: ComponentGroup[],
  lookup: ReturnType<typeof tokenLookup>,
): GeneratedFile {
  const top = topOf(groups, 'heading', 6).sort(
    (a, b) => parsePx(b.styles.fontSize) - parsePx(a.styles.fontSize),
  );
  const levels: Record<string, StyleMap> = {};
  for (let i = 1; i <= 6; i++) {
    const g = top[i - 1] ?? top[top.length - 1];
    const css: StyleMap = {};
    if (g) {
      const { bg: _bg, paddingY: _py, paddingX: _px, ...rest } = g.styles;
      Object.assign(css, toCss(rest, lookup));
    }
    levels[i] = { margin: '0', ...css };
  }
  return {
    path: 'components/Heading.tsx',
    content: `import type { CSSProperties, HTMLAttributes } from 'react';

type Level = 1 | 2 | 3 | 4 | 5 | 6;

const levels: Record<Level, CSSProperties> = ${literal(levels as Record<string, never>, 0)};

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: Level;
}

export function Heading({ level = 2, style, ...props }: HeadingProps) {
  const Tag = \`h\${level}\` as const;
  return <Tag style={{ fontFamily: 'var(--font-family-base, inherit)', ...levels[level], ...style }} {...props} />;
}
`,
  };
}

/** Starter components (Button, Input, Card, Heading) built from the top groups and tokens. */
export function generateComponents(
  groups: ComponentGroup[],
  tokens: TokenSet,
  css: string,
): GeneratedFile[] {
  const lookup = tokenLookup(tokens);
  return [
    { path: 'tokens.css', content: css },
    buttonFile(groups, lookup),
    inputFile(groups, lookup),
    cardFile(groups, lookup),
    headingFile(groups, lookup),
    {
      path: 'components/index.ts',
      content: [
        "export * from './Button';",
        "export * from './Input';",
        "export * from './Card';",
        "export * from './Heading';",
        '',
      ].join('\n'),
    },
  ];
}
