import { ShieldCheck, ExternalLink } from 'lucide-react';
import type { A11yImpact, ReportDTO } from '@uidrift/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { pathOf } from '@/lib/format';
import { Section } from '../Section';

const TONE: Record<A11yImpact, BadgeTone> = {
  critical: 'danger',
  serious: 'danger',
  moderate: 'warning',
  minor: 'neutral',
};

export default function AccessibilitySection({ report }: { report: ReportDTO }) {
  return (
    <Section
      id="accessibility"
      title="Accessibility"
      description="Serious and critical WCAG 2.1 A/AA violations found by axe-core, plus the top moderate ones."
    >
      {report.a11y.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No serious issues found"
          description="Automated checks catch around a third of issues — still test with a keyboard and screen reader."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {report.a11y.map((issue) => (
            <Card
              as="li"
              key={`${issue.id}-${issue.page}-${issue.selector}`}
              className="flex flex-col gap-2 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONE[issue.impact]}>{issue.impact}</Badge>
                <h3 className="text-sm font-semibold">{issue.help}</h3>
              </div>
              <p className="text-sm text-muted">{issue.description}</p>
              <dl className="grid gap-1 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-4">
                <dt className="text-muted">Element</dt>
                <dd className="break-all font-mono">{issue.selector}</dd>
                <dt className="text-muted">Page</dt>
                <dd className="break-all font-mono">{pathOf(issue.page)}</dd>
              </dl>
              {issue.helpUrl && (
                <a
                  href={issue.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium text-primary underline"
                >
                  How to fix <span className="sr-only">{issue.help}</span>
                  <ExternalLink aria-hidden size={14} />
                </a>
              )}
            </Card>
          ))}
        </ul>
      )}
    </Section>
  );
}
