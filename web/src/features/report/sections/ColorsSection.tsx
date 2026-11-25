import { Palette } from 'lucide-react';
import type { ReportDTO } from '@uidrift/shared';
import { ColorSwatch } from '@/components/ui/ColorSwatch';
import { EmptyState } from '@/components/ui/EmptyState';
import { Section } from '../Section';

export default function ColorsSection({ report }: { report: ReportDTO }) {
  const { colors, summary } = report;
  return (
    <Section
      eyebrow="04 · Tokens"
      id="colors"
      title="Colors"
      description={`${summary.colors.actual} distinct colors after merging near-identical shades (ΔE < 3). Ideal: ${summary.colors.ideal}.`}
    >
      {colors.length === 0 ? (
        <EmptyState icon={Palette} title="No colors captured" />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colors.map((c) => (
            <li key={c.hex}>
              <ColorSwatch hex={c.hex} count={c.count} merged={c.merged} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
