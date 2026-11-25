'use client';

import { useState } from 'react';
import { Boxes } from 'lucide-react';
import {
  COMPONENT_TYPES,
  type ComponentGroup,
  type ComponentType,
  type ReportDTO,
} from '@uidrift/shared';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ComponentPreview } from '@/components/ui/ComponentPreview';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { pathOf, plural } from '@/lib/format';
import { Section } from '../Section';

const LABELS: Record<ComponentType, string> = {
  button: 'Buttons',
  input: 'Inputs',
  heading: 'Headings',
  link: 'Links',
  card: 'Cards',
};
const STYLE_LABELS: Array<[string, string]> = [
  ['bg', 'Background'],
  ['color', 'Text'],
  ['fontSize', 'Font size'],
  ['fontWeight', 'Weight'],
  ['fontFamily', 'Family'],
  ['paddingY', 'Padding Y'],
  ['paddingX', 'Padding X'],
  ['radius', 'Radius'],
  ['border', 'Border'],
  ['shadow', 'Shadow'],
];
const PAGE_SIZE = 12;

function GroupCard({ group, rank }: { group: ComponentGroup; rank: number }) {
  const styles = STYLE_LABELS.filter(
    ([k]) => group.styles[k] && !['none', 'transparent', '0px'].includes(group.styles[k] as string),
  );
  return (
    <Card as="li" className="flex flex-col gap-4">
      <ComponentPreview type={group.type} styles={group.styles} text={group.sampleText} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">#{rank}</span>
        <span className="text-sm">Used {group.count}×</span>
        <span className="text-sm text-muted">on {plural(group.pages.length, 'page')}</span>
        {group.suggested && <Badge tone="success">Suggested standard</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {styles.map(([key, label]) => (
          <div key={key} className="flex flex-col">
            <dt className="text-muted">{label}</dt>
            <dd className="break-all font-mono">{group.styles[key]}</dd>
          </div>
        ))}
      </dl>
      <details className="text-xs">
        <summary className="cursor-pointer rounded-sm text-muted hover:text-text">Pages</summary>
        <ul className="mt-1 flex flex-col gap-1">
          {group.pages.map((p) => (
            <li key={p} className="break-all font-mono">
              {pathOf(p)}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

export default function ComponentsSection({ report }: { report: ReportDTO }) {
  const available = COMPONENT_TYPES.filter((t) => report.componentGroups.some((g) => g.type === t));
  const [tab, setTab] = useState<string>(available[0] ?? 'button');
  const [shown, setShown] = useState(PAGE_SIZE);
  const groups = report.componentGroups.filter((g) => g.type === tab);

  return (
    <Section
      eyebrow="03 · Components"
      id="components"
      title="Components"
      description="Variants are sorted by usage. The most used ones are suggested as your standard."
    >
      {available.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No components found"
          description="No buttons, inputs, headings, links or cards were visible on the scanned pages."
        />
      ) : (
        <Tabs
          label="Component types"
          value={tab}
          onChange={(id) => {
            setTab(id);
            setShown(PAGE_SIZE);
          }}
          items={available.map((t) => ({
            id: t,
            label: `${LABELS[t]} (${report.componentGroups.filter((g) => g.type === t).length})`,
          }))}
        >
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.slice(0, shown).map((g, i) => (
              <GroupCard key={g.fingerprint} group={g} rank={i + 1} />
            ))}
          </ul>
          {groups.length > shown && (
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
            >
              Show {Math.min(PAGE_SIZE, groups.length - shown)} more
            </Button>
          )}
        </Tabs>
      )}
    </Section>
  );
}
