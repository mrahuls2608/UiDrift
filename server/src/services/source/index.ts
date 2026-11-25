import type { PageResult, RawElement, SourceFile, SourceMeta } from '@uidrift/shared';
import { extractStyles } from './extract.js';
import { expandDecls } from './expand.js';
import { staticA11y } from './a11y.js';

export interface SourceAnalysisInput {
  /** Component definitions (buttons, inputs, headings, links, cards) — grouped into variants. */
  elements: RawElement[];
  /** Every other style block — counted for color, typography, spacing and radius sprawl. */
  extraStyles: Record<string, string>[];
  a11y: PageResult['a11y'];
  meta: SourceMeta;
}

const KEY_PROPS = [
  'backgroundColor',
  'color',
  'paddingTop',
  'paddingLeft',
  'borderTopLeftRadius',
  'borderTopWidth',
  'fontSize',
  'boxShadow',
];

/**
 * Deterministic source-code audit: no browser, no network, no LLM. The same input always produces
 * the same output, and the result uses the same shapes as a URL crawl so the rest of the pipeline
 * (fingerprints, grouping, scoring, tokens, React generation) is shared.
 */
export function analyzeSource(
  files: SourceFile[],
  filesReceived = files.length,
): SourceAnalysisInput {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const { blocks, markup, frameworks } = extractStyles(sorted);
  const elements: RawElement[] = [];
  const extraStyles: Record<string, string>[] = [];

  for (const b of blocks) {
    const styles = expandDecls(b.decls);
    if (!Object.keys(styles).length) continue;
    const meaningful = KEY_PROPS.filter((k) => styles[k] !== undefined).length;
    if (b.type && !b.state && meaningful >= 2) {
      elements.push({
        type: b.type,
        tag: b.label,
        text: b.text ?? b.label.slice(0, 40),
        page: `${b.file}:${b.line}`,
        styles,
      });
    } else {
      extraStyles.push(styles);
    }
  }

  const languages: Record<string, number> = {};
  for (const f of sorted) {
    const e = f.path.split('.').pop()?.toLowerCase() ?? 'other';
    languages[e] = (languages[e] ?? 0) + 1;
  }

  return {
    elements,
    extraStyles,
    a11y: staticA11y(markup, blocks),
    meta: {
      filesReceived,
      filesAnalyzed: sorted.length,
      styleBlocks: blocks.length,
      frameworks: [...frameworks].sort(),
      languages,
    },
  };
}
