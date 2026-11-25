'use client';

import dynamic from 'next/dynamic';
import type { ReportDTO } from '@uidrift/shared';
import { Card } from '@/components/ui/Card';
import { SectionSkeleton } from '@/components/ui/Skeleton';
import { Section } from '../Section';

const DistributionChart = dynamic(() => import('../DistributionChart'), {
  ssr: false,
  loading: () => <SectionSkeleton label="Loading chart" />,
});

export default function TypographySection({ report }: { report: ReportDTO }) {
  return (
    <Section
      id="typography"
      title="Typography"
      description={`${report.summary.fontSizes.actual} font sizes in use. Ideal: ${report.summary.fontSizes.ideal}.`}
    >
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h3 className="mb-4 text-base font-semibold">Font size distribution</h3>
          {report.fontSizes.length ? (
            <DistributionChart data={report.fontSizes} label="font sizes" />
          ) : (
            <p className="text-sm text-muted">No text captured.</p>
          )}
        </Card>
        <Card>
          <h3 className="mb-4 text-base font-semibold">Font families</h3>
          {report.fontFamilies.length === 0 ? (
            <p className="text-sm text-muted">No fonts captured.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {report.fontFamilies.slice(0, 10).map((f) => (
                <li
                  key={f.value}
                  className="flex items-center justify-between gap-2 border-b border-border pb-2 text-sm"
                >
                  <span className="truncate font-medium">{f.value}</span>
                  <span className="shrink-0 text-muted">{f.count}×</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </Section>
  );
}
