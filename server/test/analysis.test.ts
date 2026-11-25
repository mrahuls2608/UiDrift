import { describe, expect, it } from 'vitest';
import {
  normalizeBorder,
  normalizeShadow,
  normalizeWeight,
  primaryFontFamily,
  roundPx,
  toHex,
} from '../src/services/analysis/normalize.js';
import { clusterColors, colorsMatch, deltaE } from '../src/services/analysis/color.js';
import { fingerprintElement } from '../src/services/analysis/fingerprint.js';
import { groupComponents, isNearDuplicate } from '../src/services/analysis/group.js';
import { buildDistributions, countValues } from '../src/services/analysis/distribution.js';
import {
  a11yPenalty,
  categoryScore,
  componentsScore,
  computeScore,
} from '../src/services/analysis/score.js';
import { analyzePages } from '../src/services/analysis/index.js';
import { el, page } from './fixtures.js';

describe('normalize', () => {
  it('converts colors to hex', () => {
    expect(toHex('rgb(79, 70, 229)')).toBe('#4f46e5');
    expect(toHex('#FFF')).toBe('#ffffff');
    expect(toHex('rgba(0, 0, 0, 0)')).toBe('transparent');
    expect(toHex('rgba(0, 0, 0, 0.5)')).toBe('#00000080');
    expect(toHex('garbage')).toBe('transparent');
    expect(toHex(undefined)).toBe('transparent');
  });

  it('rounds px values to the nearest 2px', () => {
    expect(roundPx('13px')).toBe('14px');
    expect(roundPx('14.9px')).toBe('14px');
    expect(roundPx('15px')).toBe('16px');
    expect(roundPx('-0.4px')).toBe('0px');
    expect(roundPx(undefined)).toBe('0px');
  });

  it('normalizes weights, families, borders and shadows', () => {
    expect(normalizeWeight('bold')).toBe('700');
    expect(normalizeWeight('normal')).toBe('400');
    expect(normalizeWeight('550')).toBe('600');
    expect(primaryFontFamily('"Helvetica Neue", Arial')).toBe('helvetica neue');
    expect(normalizeBorder('1px', 'solid', 'rgb(0,0,0)')).toBe('1px solid #000000');
    expect(normalizeBorder('0px', 'solid', 'red')).toBe('none');
    expect(normalizeBorder('2px', 'none', 'red')).toBe('none');
    expect(normalizeShadow('rgba(0, 0, 0, 0.1) 0px 1px 3px 0px')).toBe('#0000001a 0px 2px 4px 0px');
    expect(normalizeShadow('none')).toBe('none');
  });
});

describe('color', () => {
  it('measures CIEDE2000 distance', () => {
    expect(deltaE('#4f46e5', '#4f46e5')).toBe(0);
    expect(deltaE('#4f46e5', '#5047e6')).toBeLessThan(3);
    expect(deltaE('#000000', '#ffffff')).toBeGreaterThan(50);
  });

  it('never merges transparent or opaque with translucent', () => {
    expect(colorsMatch('transparent', '#000000')).toBe(false);
    expect(colorsMatch('#00000080', '#000000')).toBe(false);
  });

  it('clusters near-identical colors behind the most used representative', () => {
    const groups = clusterColors(
      new Map([
        ['#4f46e5', 10],
        ['#5047e6', 3],
        ['#ff0000', 5],
        ['transparent', 50],
      ]),
    );
    expect(groups).toEqual([
      { hex: '#4f46e5', merged: ['#4f46e5', '#5047e6'], count: 13 },
      { hex: '#ff0000', merged: ['#ff0000'], count: 5 },
    ]);
  });
});

describe('fingerprint and grouping', () => {
  it('builds stable fingerprints from normalized styles', () => {
    const a = fingerprintElement(el('button', { fontSize: '13px' }));
    const b = fingerprintElement(el('button', { fontSize: '14px' }));
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).toContain('bg=#4f46e5');
  });

  it('groups exact duplicates and tracks pages and samples', () => {
    const groups = groupComponents([
      el('button', {}, 'https://a.test/'),
      el('button', {}, 'https://a.test/about'),
      el('button', { backgroundColor: 'rgb(220, 38, 38)' }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      count: 2,
      pages: ['https://a.test/', 'https://a.test/about'],
      suggested: true,
    });
  });

  it('merges near-duplicates (≤2px, ΔE<3) into the more used group', () => {
    const groups = groupComponents([
      el('button'),
      el('button'),
      el('button', {
        paddingTop: '10px',
        paddingBottom: '10px',
        backgroundColor: 'rgb(80, 71, 230)',
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.count).toBe(3);
    expect(groups[0]?.styles.bg).toBe('#4f46e5');
  });

  it('does not merge different component types or distant styles', () => {
    const a = fingerprintElement(el('button')).styles;
    const b = fingerprintElement(
      el('button', { paddingTop: '20px', paddingBottom: '20px' }),
    ).styles;
    expect(isNearDuplicate('button', a, b)).toBe(false);
    expect(groupComponents([el('button'), el('link')])).toHaveLength(2);
  });

  it('marks only the top ideal-count groups per type as suggested', () => {
    const colors = ['#111111', '#222222', '#333333', '#444444', '#555555'].flatMap((c, i) =>
      Array.from({ length: 5 - i }, () => el('button', { backgroundColor: c, color: '#ffffff' })),
    );
    const groups = groupComponents(colors).filter((g) => g.type === 'button');
    expect(groups.filter((g) => g.suggested)).toHaveLength(3);
    expect(groups[0]?.count).toBe(5);
  });
});

describe('distributions', () => {
  it('counts values sorted by usage', () => {
    expect(countValues(['8px', '4px', '8px'])).toEqual([
      { value: '8px', count: 2 },
      { value: '4px', count: 1 },
    ]);
  });

  it('collects colors, font sizes, spacing and radius', () => {
    const d = buildDistributions([
      el('button'),
      el('card', {
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
        borderTopColor: 'rgb(229, 231, 235)',
        borderTopLeftRadius: '0px',
      }),
    ]);
    expect(d.colorCounts.get('#4f46e5')).toBe(2);
    expect(d.colorCounts.get('#e5e7eb')).toBe(1);
    expect(d.fontSizes).toEqual([{ value: '14px', count: 1 }]);
    expect(d.spacing.map((s) => s.value)).toEqual(['8px', '16px']);
    expect(d.radius).toEqual([{ value: '6px', count: 1 }]);
  });
});

describe('score', () => {
  it('follows the PRD formula', () => {
    expect(categoryScore(3, 3)).toBe(100);
    expect(categoryScore(3, 1)).toBe(100);
    expect(categoryScore(3, 6)).toBe(50);
    expect(categoryScore(12, 0)).toBe(100);
  });

  it('averages component types that are present', () => {
    const groups = groupComponents([
      ...['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'].map((c) =>
        el('button', { backgroundColor: c }),
      ),
      el('link'),
    ]);
    expect(componentsScore(groups)).toBe(75);
    expect(componentsScore([])).toBe(100);
  });

  it('caps the accessibility penalty at 10 points and counts unique rule/page pairs', () => {
    const issue = (id: string, impact: 'critical' | 'serious', p = 'a') => ({
      id,
      impact,
      description: '',
      help: '',
      selector: 'x',
      page: p,
    });
    expect(
      a11yPenalty([issue('a', 'critical'), issue('a', 'critical'), issue('b', 'serious')]),
    ).toBe(3);
    expect(a11yPenalty(Array.from({ length: 20 }, (_, i) => issue(`r${i}`, 'critical')))).toBe(10);
  });

  it('computes a weighted overall score', () => {
    const s = computeScore({
      groups: [],
      colorGroups: 24,
      fontSizes: 8,
      spacing: 8,
      radius: 4,
      a11y: [],
    });
    expect(s.colors).toBe(50);
    expect(s.overall).toBe(90);
  });
});

describe('analyzePages', () => {
  it('produces a full report body', () => {
    const result = analyzePages([
      page(
        'https://a.test/',
        [
          el('button'),
          el('heading', { fontSize: '32px', backgroundColor: 'transparent', color: '#111827' }),
        ],
        [
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'd',
            help: 'h',
            selector: '.x',
            page: 'https://a.test/',
          },
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'd',
            help: 'h',
            selector: '.x',
            page: 'https://a.test/',
          },
        ],
      ),
      page('https://a.test/about', [
        el('button'),
        el('input', { backgroundColor: '#ffffff', color: '#111827' }),
      ]),
    ]);
    expect(result.componentGroups.map((g) => g.type).sort()).toEqual([
      'button',
      'heading',
      'input',
    ]);
    expect(result.a11y).toHaveLength(1);
    expect(result.score.a11yPenalty).toBe(1);
    expect(result.summary.components.find((c) => c.type === 'button')).toEqual({
      type: 'button',
      variants: 1,
      ideal: 3,
    });
    expect(result.score.overall).toBeGreaterThan(80);
  });
});
