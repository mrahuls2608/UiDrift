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

export default function SpacingSection({ report }: { report: ReportDTO }) {
  const { summary } = report;
  return (
    <Section
      eyebrow="06 · Tokens"
      id="spacing"
      title="Spacing & Radius"
      description="Padding and margin values (rounded to 2 px) and border radii found on components."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-base font-semibold">Spacing</h3>
          <p className="mb-4 text-sm text-muted">
            {summary.spacing.actual} values · ideal {summary.spacing.ideal}
          </p>
          {report.spacing.length ? (
            <DistributionChart data={report.spacing} label="spacing values" />
          ) : (
            <p className="text-sm text-muted">No spacing captured.</p>
          )}
        </Card>
        <Card>
          <h3 className="mb-1 text-base font-semibold">Border radius</h3>
          <p className="mb-4 text-sm text-muted">
            {summary.radius.actual} values · ideal {summary.radius.ideal}
          </p>
          {report.radius.length ? (
            <DistributionChart data={report.radius} label="border radius values" />
          ) : (
            <p className="text-sm text-muted">All corners are square.</p>
          )}
        </Card>
      </div>
    </Section>
  );
}
