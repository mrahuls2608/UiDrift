import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { analyzePages } from '../src/services/analysis/index.js';
import { generateArtifacts } from '../src/services/generator/index.js';
import { buildTokenSet, tokenLookup, tokensToCss } from '../src/services/generator/tokens.js';
import { el, page } from './fixtures.js';

const sample = analyzePages([
  page('https://a.test/', [
    el('button'),
    el('button'),
    el('button', {
      backgroundColor: '#ffffff',
      color: '#4f46e5',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: '#4f46e5',
    }),
    el('input', {
      backgroundColor: '#ffffff',
      color: '#111827',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: '#d1d5db',
    }),
    el('heading', {
      fontSize: '32px',
      fontWeight: '700',
      color: '#111827',
      backgroundColor: 'transparent',
    }),
    el('heading', {
      fontSize: '24px',
      fontWeight: '600',
      color: '#111827',
      backgroundColor: 'transparent',
    }),
    el('card', {
      backgroundColor: '#ffffff',
      boxShadow: 'rgba(0,0,0,0.1) 0px 1px 3px',
      borderTopLeftRadius: '12px',
    }),
  ]),
]);

describe('tokens', () => {
  it('names tokens and picks the primary from the top button background', () => {
    const set = buildTokenSet({ ...sample, groups: sample.componentGroups });
    expect(set.color.primary).toBe('#4f46e5');
    expect(set.color['1']).toBe('#ffffff');
    expect(Object.keys(set.fontSize)).toEqual(['xs', 'sm', 'base']);
    expect(set.fontSize.xs).toBe('14px');
    expect(set.fontFamily.base).toBe("'inter', system-ui, sans-serif");
    const css = tokensToCss(set);
    expect(css).toContain('--color-primary: #4f46e5;');
    expect(css).toContain('--font-size-base: 32px;');
  });

  it('drops unsafe values from scanned sites', () => {
    const set = buildTokenSet({
      colors: [{ hex: '#fff;}body{x:y', merged: [], count: 1 }],
      fontSizes: [{ value: '12px', count: 1 }],
      fontFamilies: [{ value: "evil'};</style>", count: 1 }],
      spacing: [],
      radius: [],
      groups: [],
    });
    expect(set.color['1']).toBeUndefined();
    expect(set.fontFamily.base).toBe("'evilstyle', system-ui, sans-serif");
  });

  it('maps raw values back to tokens', () => {
    const lookup = tokenLookup(buildTokenSet({ ...sample, groups: sample.componentGroups }));
    expect(lookup('#4f46e5')).toBe('var(--color-primary)');
    expect(lookup('14px')).toMatch(/^var\(--/);
    expect(lookup('999px')).toBeUndefined();
  });
});

describe('react components', () => {
  const { components, tokens } = generateArtifacts(sample);

  it('generates the four starter components plus tokens and an index', () => {
    expect(components.map((f) => f.path)).toEqual([
      'tokens.css',
      'components/Button.tsx',
      'components/Input.tsx',
      'components/Card.tsx',
      'components/Heading.tsx',
      'components/index.ts',
    ]);
    expect(tokens.css).toContain(':root');
    const button = components.find((f) => f.path.endsWith('Button.tsx'))?.content ?? '';
    expect(button).toContain("export type ButtonVariant = 'primary' | 'secondary';");
    expect(button).toContain('var(--color-primary)');
  });

  it('compiles with strict TypeScript and React types', () => {
    const dir = mkdtempSync(join(tmpdir(), 'uidrift-gen-'));
    for (const f of components) {
      const target = join(dir, f.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, f.content);
    }
    const require = createRequire(import.meta.url);
    const reactTypes = dirname(
      require.resolve('@types/react/package.json', { paths: [join(process.cwd(), '../web')] }),
    );
    const files = components
      .filter((f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
      .map((f) => join(dir, f.path));
    const program = ts.createProgram(files, {
      strict: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2020,
      noEmit: true,
      skipLibCheck: true,
      typeRoots: [dirname(reactTypes)],
      types: ['react'],
      paths: { react: [reactTypes], 'react/jsx-runtime': [join(reactTypes, 'jsx-runtime.d.ts')] },
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    expect(diagnostics).toEqual([]);
  });
});
