import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import type { RawA11yIssue } from '@uidrift/shared';
import { BulletBar } from '@/components/ui/BulletBar';
import { groupByRule } from '@/features/report/sections/AccessibilitySection';

describe('BulletBar', () => {
  it('shows the value as text with its label for screen readers', async () => {
    const { container } = render(<BulletBar label="Colors" hint="20%" value={67.4} />);
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('67')).toBeInTheDocument();
    expect(screen.getByText(/out of 100, Drifting/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('groupByRule', () => {
  const issue = (id: string, impact: RawA11yIssue['impact'], selector: string): RawA11yIssue => ({
    id,
    impact,
    selector,
    page: 'https://a.test/',
    description: 'd',
    help: id,
  });

  it('groups by rule, keeps the worst impact and sorts by severity then size', () => {
    const groups = groupByRule([
      issue('label', 'moderate', 'input'),
      issue('color-contrast', 'serious', '.a'),
      issue('color-contrast', 'serious', '.b'),
      issue('color-contrast', 'serious', '.c'),
      issue('image-alt', 'critical', 'img'),
      issue('label', 'serious', 'select'),
    ]);
    expect(groups.map((g) => [g.id, g.impact, g.nodes.length])).toEqual([
      ['image-alt', 'critical', 1],
      ['color-contrast', 'serious', 3],
      ['label', 'serious', 2],
    ]);
  });
});
