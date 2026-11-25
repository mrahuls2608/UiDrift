/** Shared helpers for scanning HTML / JSX / Vue / Svelte markup with regular expressions. */

export interface MarkupTag {
  tag: string;
  attrs: string;
  /** Text content up to the matching close tag (tags stripped), when it could be found. */
  inner?: string;
  /** Raw inner markup, used to detect `{expressions}` that may render text. */
  innerRaw?: string;
  index: number;
  selfClosing: boolean;
}

// Attribute values may contain quotes or (two levels of) JSX braces, e.g. style={{ a: 1 }}.
const TAG_RE =
  /<([A-Za-z][\w.:-]*)((?:[^>"'{}]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*?)(\/?)>/g;

export function scanTags(markup: string): MarkupTag[] {
  const tags: MarkupTag[] = [];
  for (const m of markup.matchAll(TAG_RE)) {
    const tag = m[1] as string;
    if (tag === 'style' || tag === 'script') continue;
    const selfClosing = m[3] === '/';
    const entry: MarkupTag = { tag, attrs: m[2] ?? '', index: m.index ?? 0, selfClosing };
    if (!selfClosing && /^(button|a|Button|Link|label)$/.test(tag)) {
      const start = (m.index ?? 0) + m[0].length;
      const close = markup.indexOf(`</${tag}>`, start);
      if (close !== -1 && close - start < 4000) {
        const raw = markup.slice(start, close);
        entry.innerRaw = raw;
        entry.inner = raw
          .replace(/<[^>]*>/g, ' ')
          .replace(/\{[^{}]*\}/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    tags.push(entry);
  }
  return tags;
}

export function attr(attrs: string, name: string): string | undefined {
  const re = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)'|\\{([\\s\\S]*?)\\}(?=\\s|$|/))`,
    'i',
  );
  const m = attrs.match(re);
  if (!m) return undefined;
  return m[2] ?? m[3] ?? m[4] ?? '';
}

export function hasAttr(attrs: string, name: string): boolean {
  return new RegExp(`(?:^|\\s)${name}(\\s*=|\\s|$)`, 'i').test(attrs);
}

/** All static class names in class / className (including clsx/cn(...) string arguments). */
export function classList(attrs: string): string {
  const m = attrs.match(
    /(?:^|\s)(?:class|className)\s*=\s*("([^"]*)"|'([^']*)'|\{([\s\S]*?)\}(?=\s|$|\/))/,
  );
  if (!m) return '';
  if (m[2] !== undefined || m[3] !== undefined) return (m[2] ?? m[3]) as string;
  const expr = m[4] ?? '';
  const strings = [...expr.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)].map((s) =>
    (s[1] ?? s[2] ?? s[3] ?? '').replace(/\$\{[^}]*\}/g, ' '),
  );
  return strings.join(' ');
}

/** React `style={{ backgroundColor: '#fff', padding: 8 }}` → { backgroundColor: '#fff', padding: 8 } */
export function inlineStyleObject(attrs: string): Record<string, string | number> {
  const m = attrs.match(/(?:^|\s)style\s*=\s*\{\{([\s\S]*?)\}\}/);
  const out: Record<string, string | number> = {};
  if (m) {
    for (const p of (m[1] as string).matchAll(
      /([A-Za-z]+)\s*:\s*(?:'([^']*)'|"([^"]*)"|`([^`$]*)`|(-?\d+(?:\.\d+)?))/g,
    )) {
      const value = p[2] ?? p[3] ?? p[4];
      out[p[1] as string] = value !== undefined ? value : Number(p[5]);
    }
    return out;
  }
  const html = attrs.match(/(?:^|\s)style\s*=\s*"([^"]*)"/);
  if (html) {
    for (const decl of (html[1] as string).split(';')) {
      const i = decl.indexOf(':');
      if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
    }
  }
  return out;
}

/** 1-based line number for an index, using precomputed newline offsets. */
export function lineIndex(text: string): (index: number) => number {
  const offsets: number[] = [];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) offsets.push(i);
  return (index: number) => {
    let lo = 0;
    let hi = offsets.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((offsets[mid] as number) < index) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };
}
