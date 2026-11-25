/**
 * Small, dependency-free parser for CSS, SCSS, Sass-like nesting and LESS. It is not a full CSS
 * implementation: it extracts rule blocks (selector + declarations + line), resolves `$scss`,
 * `@less` and `--custom` variables, flattens nesting (`&`) and skips at-rules that don't style
 * elements (`@keyframes`, `@font-face`, `@import`, ...). That is enough to audit design tokens.
 */

export interface CssRule {
  selector: string;
  decls: Record<string, string>;
  line: number;
}

export interface ParseResult {
  rules: CssRule[];
  /** CSS custom properties defined anywhere in the file (`--x: value`). */
  customProps: Record<string, string>;
}

const SKIP_AT_RULES =
  /^@(keyframes|-webkit-keyframes|font-face|import|use|forward|charset|namespace|page|property|counter-style|layer\s*[^{]*;)/i;

function stripComments(css: string): string {
  // Keep newlines so line numbers stay correct.
  return css
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'])\/\/[^\n]*/g, (m, p: string) => p + ' '.repeat(m.length - p.length));
}

function combine(parents: string[], child: string): string[] {
  const kids = child
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (!parents.length) return kids;
  const out: string[] = [];
  for (const p of parents)
    for (const k of kids) out.push(k.includes('&') ? k.replace(/&/g, p) : `${p} ${k}`);
  return out.slice(0, 24);
}

interface Frame {
  selectors: string[];
  skip: boolean;
  isAtRule: boolean;
  decls: Record<string, string>;
  line: number;
}

/** Parse a stylesheet. `vars` carries variables across files (e.g. a shared `_variables.scss`). */
export function parseCss(
  source: string,
  vars: Record<string, string> = {},
  lineOffset = 0,
): ParseResult {
  const css = stripComments(source);
  const rules: CssRule[] = [];
  const customProps: Record<string, string> = {};
  const stack: Frame[] = [];
  let buf = '';
  let line = 1 + lineOffset;
  let quote: string | null = null;
  let parenDepth = 0;

  const flushDecl = () => {
    const text = buf.trim();
    buf = '';
    if (!text) return;
    const idx = text.indexOf(':');
    if (idx <= 0) return;
    const prop = text.slice(0, idx).trim();
    const value = text
      .slice(idx + 1)
      .replace(/!important/i, '')
      .trim();
    if (!value) return;
    if (/^\$[\w-]+$/.test(prop) || /^@[\w-]+$/.test(prop)) {
      vars[prop] = value.replace(/!default/i, '').trim();
      return;
    }
    if (prop.startsWith('--')) customProps[prop] = value;
    const top = stack[stack.length - 1];
    if (top && !top.skip && !top.isAtRule && /^[a-z-]+$/i.test(prop))
      top.decls[prop.toLowerCase()] = value;
  };

  for (let i = 0; i < css.length; i++) {
    const ch = css[i] as string;
    if (ch === '\n') line++;
    if (quote) {
      buf += ch;
      if (ch === quote && css[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (ch === ';' && parenDepth === 0) {
      flushDecl();
      continue;
    }
    if (ch === '{' && parenDepth === 0) {
      const head = buf.trim();
      buf = '';
      const parent = stack[stack.length - 1];
      const isAt = head.startsWith('@');
      const skip =
        (parent?.skip ?? false) ||
        SKIP_AT_RULES.test(head) ||
        /^@(mixin|function|each|for|while)\b/.test(head);
      const selectors = isAt
        ? (parent?.selectors ?? [])
        : combine(parent && !parent.isAtRule ? parent.selectors : (parent?.selectors ?? []), head);
      stack.push({ selectors, skip, isAtRule: isAt, decls: {}, line });
      continue;
    }
    if (ch === '}' && parenDepth === 0) {
      flushDecl();
      const frame = stack.pop();
      if (frame && !frame.skip && !frame.isAtRule && Object.keys(frame.decls).length) {
        for (const selector of frame.selectors)
          rules.push({
            selector,
            decls: resolveAll(frame.decls, vars, customProps),
            line: frame.line,
          });
      }
      continue;
    }
    buf += ch;
  }
  // Re-resolve with every custom property now known (definitions may come after use).
  for (const r of rules) r.decls = resolveAll(r.decls, vars, customProps);
  return { rules, customProps };
}

function resolveAll(
  decls: Record<string, string>,
  vars: Record<string, string>,
  custom: Record<string, string>,
) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(decls)) out[k] = resolveValue(v, vars, custom);
  return out;
}

/** Substitute `$var`, `@var` and `var(--x, fallback)` (up to 5 levels deep). */
export function resolveValue(
  value: string,
  vars: Record<string, string>,
  custom: Record<string, string>,
): string {
  let v = value;
  for (let depth = 0; depth < 5; depth++) {
    const next = v
      .replace(/[$@][\w-]+/g, (name) => vars[name] ?? name)
      .replace(
        /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g,
        (m, name: string, fb?: string) => custom[name] ?? fb?.trim() ?? m,
      );
    if (next === v) break;
    v = next;
  }
  return v.trim();
}
