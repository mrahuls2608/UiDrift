'use client';

import type { ReportDTO } from '@uidrift/shared';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { useToast } from '@/components/ui/Toast';
import { formatDate, plural } from '@/lib/format';

const CATEGORIES = [
  ['components', 'Components', '40%'],
  ['colors', 'Colors', '20%'],
  ['typography', 'Typography', '20%'],
  ['spacing', 'Spacing', '10%'],
  ['radius', 'Radius', '10%'],
] as const;

export function Overview({ report }: { report: ReportDTO }) {
  const toast = useToast();
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share)
        await navigator.share({ title: `UIDrift report for ${report.domain}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('success', 'Report link copied to clipboard.');
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <section id="overview" aria-labelledby="overview-heading" className="scroll-mt-16">
      <Card className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex justify-center">
          <ScoreRing value={report.score.overall} size={176} />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h1 id="overview-heading" className="break-all text-xl font-bold sm:text-2xl">
              {report.domain}
            </h1>
            <p className="text-sm text-muted">
              <a
                href={report.url}
                target="_blank"
                rel="noreferrer nofollow"
                className="underline hover:text-text"
              >
                {report.url}
              </a>{' '}
              · {plural(report.pagesScanned.length, 'page')} scanned ·{' '}
              {formatDate(report.createdAt)}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CATEGORIES.map(([key, label, weight]) => (
              <div key={key} className="rounded-sm border border-border bg-bg p-2">
                <dt className="text-xs text-muted">
                  {label} <span className="sr-only">weight</span>({weight})
                </dt>
                <dd className="text-lg font-bold">{report.score[key]}</dd>
              </div>
            ))}
          </dl>
          {report.score.a11yPenalty > 0 && (
            <p className="text-sm text-muted">
              Accessibility issues lowered the score by {report.score.a11yPenalty} points.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={share}>
              <Share2 aria-hidden size={16} /> Share
            </Button>
            <a
              href="#export"
              className="inline-flex h-12 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90"
            >
              <Download aria-hidden size={16} /> Export
            </a>
          </div>
        </div>
      </Card>
    </section>
  );
}
