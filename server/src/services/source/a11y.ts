import { parse, wcagContrast } from 'culori';
import type { RawA11yIssue } from '@uidrift/shared';
import type { MarkupFile, StyleBlock } from './extract.js';
import { attr, classList, hasAttr } from './markup.js';
import { parsePx, toHex } from '../analysis/normalize.js';

/**
 * Static accessibility checks on source code. They mirror the axe-core rules a URL audit runs
 * (same rule ids and impacts) but work on markup and styles, so no browser is needed.
 */

const AXE = (id: string) => `https://dequeuniversity.com/rules/axe/4.10/${id}`;

const RULES = {
  'image-alt': {
    impact: 'critical',
    help: 'Images must have alternative text',
    description: 'Ensure <img> elements have alternative text or a role of none or presentation',
  },
  label: {
    impact: 'critical',
    help: 'Form elements must have labels',
    description: 'Ensure every form element has a label',
  },
  'button-name': {
    impact: 'critical',
    help: 'Buttons must have discernible text',
    description: 'Ensure buttons have discernible text',
  },
  'link-name': {
    impact: 'serious',
    help: 'Links must have discernible text',
    description: 'Ensure links have discernible text',
  },
  tabindex: {
    impact: 'serious',
    help: 'Elements should not have tabindex greater than zero',
    description: 'Ensure tabindex attribute values are not greater than 0',
  },
  'html-has-lang': {
    impact: 'serious',
    help: '<html> element must have a lang attribute',
    description: 'Ensure every HTML document has a lang attribute',
  },
  'color-contrast': {
    impact: 'serious',
    help: 'Elements must meet minimum color contrast ratio thresholds',
    description:
      'Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds',
  },
  'focus-visible': {
    impact: 'moderate',
    help: 'Focus indicator must not be removed',
    description:
      'Removing the outline on focus without a replacement hides keyboard focus (WCAG 2.4.7)',
  },
} as const;

type RuleId = keyof typeof RULES;

function issue(id: RuleId, page: string, selector: string): RawA11yIssue {
  const r = RULES[id];
  return {
    id,
    impact: r.impact,
    help: r.help,
    description: r.description,
    helpUrl:
      id === 'focus-visible'
        ? 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html'
        : AXE(id),
    selector: selector.replace(/\s+/g, ' ').slice(0, 160),
    page,
  };
}

const snippet = (tag: string, attrs: string) =>
  `<${tag}${attrs.replace(/\s+/g, ' ').slice(0, 100)}>`;
const isHidden = (attrs: string) =>
  /aria-hidden\s*=\s*["{]?true|role\s*=\s*["'](presentation|none)["']/.test(attrs);
const hasName = (attrs: string) =>
  hasAttr(attrs, 'aria-label') || hasAttr(attrs, 'aria-labelledby') || hasAttr(attrs, 'title');

function markupIssues(m: MarkupFile): RawA11yIssue[] {
  const out: RawA11yIssue[] = [];
  const labelled = new Set(
    m.tags
      .filter((t) => t.tag === 'label')
      .map((t) => attr(t.attrs, 'htmlFor') ?? attr(t.attrs, 'for'))
      .filter(Boolean),
  );
  const labelRanges = m.tags
    .filter((t) => t.tag === 'label' && t.innerRaw)
    .map((t) => [t.index, t.index + (t.innerRaw?.length ?? 0) + 200]);
  for (const t of m.tags) {
    const where = `${m.file}:${m.line(t.index)}`;
    const lower = t.tag.toLowerCase();
    if ((lower === 'img' || t.tag === 'Image') && !hasAttr(t.attrs, 'alt') && !isHidden(t.attrs))
      out.push(issue('image-alt', where, snippet(t.tag, t.attrs)));
    if (['input', 'textarea', 'select'].includes(lower)) {
      const type = attr(t.attrs, 'type') ?? '';
      if (!/^(hidden|submit|button|reset|image)$/.test(type) && !hasName(t.attrs)) {
        const id = attr(t.attrs, 'id');
        const wrapped = labelRanges.some(
          ([a, b]) => t.index > (a as number) && t.index < (b as number),
        );
        if (!wrapped && !(id && labelled.has(id)))
          out.push(issue('label', where, snippet(t.tag, t.attrs)));
      }
    }
    if (
      lower === 'button' &&
      t.innerRaw !== undefined &&
      !t.inner &&
      !/\{/.test(t.innerRaw) &&
      !hasName(t.attrs)
    ) {
      out.push(issue('button-name', where, snippet(t.tag, t.attrs)));
    }
    if (
      lower === 'a' &&
      hasAttr(t.attrs, 'href') &&
      t.innerRaw !== undefined &&
      !t.inner &&
      !/\{/.test(t.innerRaw) &&
      !hasName(t.attrs)
    ) {
      out.push(issue('link-name', where, snippet(t.tag, t.attrs)));
    }
    const tab = attr(t.attrs, 'tabIndex') ?? attr(t.attrs, 'tabindex');
    if (tab && parseInt(tab, 10) > 0) out.push(issue('tabindex', where, snippet(t.tag, t.attrs)));
    if (lower === 'html' && m.isHtmlDocument && !hasAttr(t.attrs, 'lang'))
      out.push(issue('html-has-lang', where, '<html>'));
    const cls = classList(t.attrs);
    if (
      /(^|\s)focus(-visible)?:outline-none(\s|$)/.test(cls) &&
      !/(focus(-visible)?:ring|focus(-visible)?:outline-(?!none)|focus(-visible)?:border|focus(-visible)?:shadow)/.test(
        cls,
      )
    ) {
      out.push(issue('focus-visible', where, snippet(t.tag, t.attrs)));
    }
  }
  return out;
}

/** WCAG contrast for a block that sets both an opaque text and background color. */
export function contrastIssue(b: StyleBlock): RawA11yIssue | undefined {
  const fg = toHex(b.decls.color);
  const bg = toHex(
    b.decls['background-color'] ??
      b.decls.background?.split(/\s+/).find((p) => /^#|^rgb|^hsl/.test(p)),
  );
  if (fg.length !== 7 || bg.length !== 7) return undefined;
  const ratio = wcagContrast(parse(fg)!, parse(bg)!);
  const size = parsePx(b.decls['font-size']);
  const bold = /bold|[6-9]00/.test(b.decls['font-weight'] ?? '');
  const large = size >= 24 || (bold && size >= 18.66);
  if (ratio >= (large ? 3 : 4.5)) return undefined;
  return {
    ...issue(
      'color-contrast',
      `${b.file}:${b.line}`,
      `${b.label} (${fg} on ${bg}, ${ratio.toFixed(2)}:1)`,
    ),
  };
}

export function staticA11y(markup: MarkupFile[], blocks: StyleBlock[]): RawA11yIssue[] {
  const out: RawA11yIssue[] = markup.flatMap(markupIssues);
  for (const b of blocks) {
    const c = contrastIssue(b);
    if (c) out.push(c);
    if (
      b.state &&
      /:focus/.test(b.label) &&
      /^(none|0)$/.test(b.decls.outline ?? '') &&
      !b.decls['box-shadow'] &&
      !b.decls.border
    ) {
      out.push(issue('focus-visible', `${b.file}:${b.line}`, b.label));
    }
  }
  return out;
}
