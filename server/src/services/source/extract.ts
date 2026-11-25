import type { ComponentType, SourceFile } from '@uidrift/shared';
import { parseCss, resolveValue, type CssRule } from './css-parser.js';
import { classifySelector, classifyTag, STATE_SELECTOR } from './classify.js';
import { classList, inlineStyleObject, lineIndex, scanTags, type MarkupTag } from './markup.js';
import { tailwindToDecls } from './tailwind.js';
import { jsValueToCss, kebab } from './expand.js';

export type BlockOrigin = 'css' | 'style-tag' | 'css-in-js' | 'inline-style' | 'tailwind';

/** One authored style definition: a CSS rule, a styled-component, or an element's classes/style. */
export interface StyleBlock {
  file: string;
  line: number;
  label: string;
  type?: ComponentType;
  /** True for :hover/:focus/... rules — counted for tokens, not as component variants. */
  state: boolean;
  origin: BlockOrigin;
  decls: Record<string, string>;
  text?: string;
}

export interface MarkupFile {
  file: string;
  tags: MarkupTag[];
  line: (index: number) => number;
  isHtmlDocument: boolean;
}

export interface Extraction {
  blocks: StyleBlock[];
  markup: MarkupFile[];
  tailwindHits: number;
  frameworks: Set<string>;
}

const ext = (path: string) => path.split('.').pop()?.toLowerCase() ?? '';
const STYLESHEET = new Set(['css', 'scss', 'sass', 'less']);
const MARKUP = new Set([
  'html',
  'htm',
  'vue',
  'svelte',
  'astro',
  'jsx',
  'tsx',
  'js',
  'ts',
  'mjs',
  'cjs',
]);

function rulesToBlocks(
  file: string,
  rules: CssRule[],
  origin: BlockOrigin,
  typeHint?: ComponentType,
): StyleBlock[] {
  return rules.map((r) => ({
    file,
    line: r.line,
    label: r.selector,
    type: typeHint ?? classifySelector(r.selector),
    state: STATE_SELECTOR.test(r.selector),
    origin,
    decls: r.decls,
  }));
}

/** styled.button`...`, styled(Card)`...`, css`...` (styled-components / emotion / goober). */
function cssInJs(
  file: string,
  code: string,
  vars: Record<string, string>,
  line: (i: number) => number,
): StyleBlock[] {
  const blocks: StyleBlock[] = [];
  const re =
    /(?:const|let|var)?\s*([A-Z]\w*)?\s*=?\s*(?:styled(?:\.(\w+)|\(\s*([\w.]+)\s*\))(?:\.attrs\([^`]*?\))?|css)\s*`([\s\S]*?)`/g;
  for (const m of code.matchAll(re)) {
    const name = m[1];
    const tag = m[2] ?? m[3];
    const body = (m[4] ?? '').replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, '__interp__');
    const startLine = line(m.index ?? 0);
    const label = name ?? (tag ? `styled.${tag}` : 'css``');
    const type = (name ? classifyTag(name) : undefined) ?? (tag ? classifyTag(tag) : undefined);
    const { rules } = parseCss(`__root__ {\n${body}\n}`, vars, startLine - 2);
    for (const r of rules) r.selector = r.selector.replace(/__root__/g, label);
    blocks.push(...rulesToBlocks(file, rules, 'css-in-js', type));
  }
  return blocks;
}

function markupBlocks(
  file: string,
  tags: MarkupTag[],
  line: (i: number) => number,
  onTailwind: () => void,
): StyleBlock[] {
  const blocks: StyleBlock[] = [];
  for (const t of tags) {
    const classes = classList(t.attrs);
    const decls: Record<string, string> = {};
    let origin: BlockOrigin = 'tailwind';
    if (classes) {
      const tw = tailwindToDecls(classes);
      if (Object.keys(tw.decls).length) onTailwind();
      Object.assign(decls, tw.decls);
    }
    const inline = inlineStyleObject(t.attrs);
    if (Object.keys(inline).length) {
      origin = 'inline-style';
      for (const [k, v] of Object.entries(inline)) {
        const prop = k.includes('-') ? k.toLowerCase() : kebab(k);
        decls[prop] = jsValueToCss(prop, v);
      }
    }
    if (!Object.keys(decls).length) continue;
    blocks.push({
      file,
      line: line(t.index),
      label: `<${t.tag}>`,
      type: classifyTag(t.tag),
      state: false,
      origin,
      decls,
      text: t.inner?.slice(0, 40) || classes.slice(0, 40),
    });
  }
  return blocks;
}

/**
 * Pass 1 collects SCSS/LESS variables and CSS custom properties from every stylesheet so tokens
 * defined in one file (e.g. `_variables.scss`, `:root {}`) resolve in all the others.
 */
function collectVariables(files: SourceFile[]) {
  const vars: Record<string, string> = {};
  const custom: Record<string, string> = {};
  for (const f of files) {
    const e = ext(f.path);
    const sheets = STYLESHEET.has(e)
      ? [f.content]
      : [...f.content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1] ?? '');
    for (const css of sheets) Object.assign(custom, parseCss(css, vars).customProps);
  }
  return { vars, custom };
}

export function extractStyles(files: SourceFile[]): Extraction {
  const { vars, custom } = collectVariables(files);
  const blocks: StyleBlock[] = [];
  const markup: MarkupFile[] = [];
  const frameworks = new Set<string>();
  let tailwindHits = 0;

  for (const f of files) {
    const e = ext(f.path);
    const line = lineIndex(f.content);
    if (STYLESHEET.has(e)) {
      if (e !== 'css') frameworks.add(e === 'less' ? 'LESS' : 'Sass');
      blocks.push(...rulesToBlocks(f.path, parseCss(f.content, vars).rules, 'css'));
      continue;
    }
    if (!MARKUP.has(e)) continue;
    if (e === 'vue') frameworks.add('Vue');
    if (e === 'svelte') frameworks.add('Svelte');
    if (e === 'astro') frameworks.add('Astro');
    if ((e === 'jsx' || e === 'tsx') && /from\s+['"]react['"]|<\w/.test(f.content))
      frameworks.add('React');
    if (/from\s+['"](styled-components|@emotion\/styled|@emotion\/react)['"]/.test(f.content))
      frameworks.add('CSS-in-JS');

    for (const m of f.content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
      const offset = line(m.index ?? 0) - 1;
      blocks.push(...rulesToBlocks(f.path, parseCss(m[1] ?? '', vars, offset).rules, 'style-tag'));
    }
    if (/styled|css`/.test(f.content)) blocks.push(...cssInJs(f.path, f.content, vars, line));

    const tags = scanTags(f.content);
    if (tags.length) {
      markup.push({
        file: f.path,
        tags,
        line,
        isHtmlDocument: /^html?$/.test(e) && /<html[\s>]/i.test(f.content),
      });
      blocks.push(...markupBlocks(f.path, tags, line, () => tailwindHits++));
    }
  }

  for (const b of blocks) {
    for (const [k, v] of Object.entries(b.decls)) b.decls[k] = resolveValue(v, vars, custom);
  }
  if (tailwindHits > 0) frameworks.add('Tailwind CSS');
  return { blocks, markup, tailwindHits, frameworks };
}
