import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseCss, resolveValue } from '../src/services/source/css-parser.js';
import { expandDecls, toPx } from '../src/services/source/expand.js';
import { tailwindClassToDecls, tailwindToDecls } from '../src/services/source/tailwind.js';
import { classifySelector, classifyTag } from '../src/services/source/classify.js';
import { classList, inlineStyleObject, scanTags } from '../src/services/source/markup.js';
import { analyzeSource } from '../src/services/source/index.js';
import {
  fetchGithubRepo,
  filesFromZip,
  filterSourceFiles,
  parseGithubRepo,
} from '../src/services/source/ingest.js';
import { analyzeData } from '../src/services/analysis/index.js';

const SAMPLE = join(process.cwd(), '../samples/acme-ui');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) =>
    statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)],
  );
const sampleFiles = () =>
  filterSourceFiles(
    walk(SAMPLE).map((p) => ({ path: relative(SAMPLE, p), content: readFileSync(p, 'utf8') })),
  ).files;

describe('css parser', () => {
  it('flattens SCSS nesting, resolves $variables and skips keyframes', () => {
    const vars: Record<string, string> = {};
    const { rules } = parseCss(
      '$brand: #2563eb;\n.hero {\n  .cta { color: $brand; &:hover { color: red; } }\n}\n@keyframes x { from { opacity: 0 } }',
      vars,
    );
    expect(rules.map((r) => [r.selector, r.decls.color, r.line])).toEqual([
      ['.hero .cta:hover', 'red', 3],
      ['.hero .cta', '#2563eb', 3],
    ]);
  });

  it('resolves custom properties defined after use and var() fallbacks', () => {
    const { rules } = parseCss(
      '.a { color: var(--brand); background: var(--missing, #fff); }\n:root { --brand: #111; }',
    );
    expect(rules[0]?.decls).toEqual({ color: '#111', background: '#fff' });
    expect(resolveValue('var(--x, var(--y, 4px))', {}, {})).toBe('4px');
  });

  it('keeps media query rules and ignores comments and strings with semicolons', () => {
    const { rules } = parseCss(
      '/* c; */ @media (max-width: 1px) { .b { content: "a;b"; padding: 2px; } } // line',
    );
    expect(rules[0]).toMatchObject({ selector: '.b', decls: { content: '"a;b"', padding: '2px' } });
  });
});

describe('declaration expansion', () => {
  it('converts units and shorthands to computed-style keys', () => {
    expect(toPx('1.5rem')).toBe('24px');
    expect(toPx('12pt')).toBe('16px');
    expect(toPx('calc(1px + 2px)')).toBeUndefined();
    expect(
      expandDecls({
        padding: '8px 1rem',
        border: '1px solid #ccc',
        'border-radius': '6px 4px',
        font: '600 14px/20px Inter, sans-serif',
        background: '#fff url(x.png)',
      }),
    ).toEqual({
      paddingTop: '8px',
      paddingRight: '16px',
      paddingBottom: '8px',
      paddingLeft: '16px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: '#ccc',
      borderTopLeftRadius: '6px',
      fontSize: '14px',
      lineHeight: '20px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
    });
  });

  it('drops unresolved values instead of guessing', () => {
    expect(expandDecls({ color: 'var(--x)', padding: '$space' })).toEqual({});
  });
});

describe('tailwind mapping', () => {
  it('maps spacing, colors, sizes, radius, shadows and arbitrary values', () => {
    expect(tailwindClassToDecls('px-2.5')).toEqual({
      'padding-left': '10px',
      'padding-right': '10px',
    });
    expect(tailwindClassToDecls('bg-blue-600')).toEqual({ 'background-color': '#2563eb' });
    expect(tailwindClassToDecls('bg-white/50')).toEqual({
      'background-color': 'rgba(255,255,255,0.5)',
    });
    expect(tailwindClassToDecls('text-[15px]')).toEqual({ 'font-size': '15px' });
    expect(tailwindClassToDecls('text-[#123456]')).toEqual({ color: '#123456' });
    expect(tailwindClassToDecls('rounded-full')).toEqual({ 'border-radius': '9999px' });
    expect(tailwindClassToDecls('border')).toEqual({
      'border-width': '1px',
      'border-style': 'solid',
    });
    expect(tailwindClassToDecls('flex')).toEqual({});
  });

  it('skips variant classes but reports them', () => {
    const r = tailwindToDecls('text-sm hover:bg-red-500 md:p-8');
    expect(r.decls).toEqual({ 'font-size': '14px' });
    expect(r.variants).toEqual(['hover:bg-red-500', 'md:p-8']);
  });
});

describe('classification and markup', () => {
  it('classifies selectors and component names', () => {
    expect(classifySelector('.hero .btn-primary')).toBe('button');
    expect(classifySelector('.btn-group')).toBeUndefined();
    expect(classifySelector('input[type="checkbox"]')).toBeUndefined();
    expect(classifySelector('.pricing-card')).toBe('card');
    expect(classifySelector('.card-header')).toBeUndefined();
    expect(classifyTag('IconButton')).toBe('button');
    expect(classifyTag('h3')).toBe('heading');
    expect(classifyTag('div')).toBeUndefined();
  });

  it('reads class lists, clsx strings and inline style objects', () => {
    const [tag] = scanTags(
      '<button className={clsx("px-4", cond && "bg-red-500")} style={{ padding: 8, color: "#fff" }}>Go</button>',
    );
    expect(classList(tag!.attrs)).toBe('px-4 bg-red-500');
    expect(inlineStyleObject(tag!.attrs)).toEqual({ padding: 8, color: '#fff' });
    expect(tag!.inner).toBe('Go');
  });
});

describe('analyzeSource (sample project)', () => {
  const result = analyzeSource(sampleFiles());
  const report = analyzeData(result);

  it('detects frameworks and skips non-source files', () => {
    expect(result.meta.frameworks).toEqual(['CSS-in-JS', 'React', 'Sass', 'Tailwind CSS', 'Vue']);
    expect(Object.keys(result.meta.languages)).not.toContain('md');
  });

  it('groups component variants across CSS, Tailwind, styled-components and inline styles', () => {
    const buttons = report.componentGroups.filter((g) => g.type === 'button');
    expect(buttons.length).toBe(11);
    const pages = buttons.map((b) => b.pages.join(' + '));
    // Tailwind (bg-blue-600 …) and styled-components (#2563eb) define the same primary button.
    expect(pages).toContain('src/components/Button.tsx:16 + src/components/PromoBanner.tsx:4');
    // Tailwind bg-sky-500 and the Vue .save-button (#0ea5e9) are the same variant.
    expect(pages).toContain('src/components/Button.tsx:18 + src/pages/Settings.vue:14');
    expect(report.componentGroups.filter((g) => g.type === 'card')).toHaveLength(5);
    expect(report.colors.find((c) => c.hex === '#2563eb')?.merged).toContain('#2464ea');
    expect(report.radius.map((r) => r.value)).toContain('9999px');
  });

  it('finds accessibility problems statically with file:line locations', () => {
    const ids = report.a11y.map((a) => `${a.id}@${a.page}`);
    expect(ids).toEqual(
      expect.arrayContaining([
        'image-alt@src/pages/Checkout.tsx:5',
        'label@src/pages/Checkout.tsx:6',
        'button-name@src/pages/Checkout.tsx:10',
        'link-name@src/pages/Settings.vue:7',
        'html-has-lang@public/index.html:2',
        'tabindex@public/index.html:12',
        'focus-visible@src/styles/global.css:23',
      ]),
    );
    expect(ids).not.toContain('label@src/pages/Settings.vue:5');
    const contrast = report.a11y.find(
      (a) => a.id === 'color-contrast' && a.page === 'src/styles/global.css:26',
    );
    expect(contrast?.selector).toContain('2.54:1');
  });

  it('is deterministic', () => {
    expect(analyzeData(analyzeSource([...sampleFiles()].reverse()))).toEqual(report);
  });
});

describe('ingestion', () => {
  it('filters vendored, minified and unsupported files', () => {
    const { files } = filterSourceFiles([
      { path: 'node_modules/x/a.css', content: 'a{}' },
      { path: 'dist/app.min.css', content: 'a{}' },
      { path: 'README.md', content: '#' },
      { path: './src/a.scss', content: 'a{}' },
      { path: '../etc/passwd.css', content: 'a{}' },
    ]);
    expect(files.map((f) => f.path)).toEqual(['src/a.scss']);
  });

  it('rejects input without analyzable files', () => {
    expect(() => filterSourceFiles([{ path: 'a.md', content: '' }])).toThrow(/No CSS/);
  });

  it('reads ZIPs and strips a single top-level folder', async () => {
    const zip = new JSZip();
    zip.file('repo-main/src/a.css', '.btn{color:red}');
    zip.file('repo-main/logo.png', 'x');
    const files = await filesFromZip(await zip.generateAsync({ type: 'uint8array' }));
    expect(files).toEqual([{ path: 'src/a.css', content: '.btn{color:red}' }]);
  });

  it('parses GitHub URLs and downloads only from codeload.github.com', async () => {
    expect(parseGithubRepo('github.com/acme/ui/tree/dev')).toEqual({
      owner: 'acme',
      repo: 'ui',
      ref: 'dev',
    });
    expect(() => parseGithubRepo('https://gitlab.com/a/b')).toThrow(/GitHub/);
    const zip = new JSZip();
    zip.file('ui-HEAD/a.css', '.card{padding:4px}');
    const body = await zip.generateAsync({ type: 'uint8array' });
    const calls: string[] = [];
    const fake = (async (url: string) => {
      calls.push(url);
      return new Response(body.slice().buffer as ArrayBuffer, { status: 200 });
    }) as unknown as typeof fetch;
    const result = await fetchGithubRepo('https://github.com/acme/ui', fake);
    expect(calls).toEqual(['https://codeload.github.com/acme/ui/zip/HEAD']);
    expect(result.files[0]?.path).toBe('a.css');
  });
});
