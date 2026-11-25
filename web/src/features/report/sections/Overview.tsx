'use client';

import type { ReportDTO } from '@uidrift/shared';
import {
  CalendarDays,
  Download,
  FileCode2,
  FileStack,
  Globe,
  Link2,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { BulletBar } from '@/components/ui/BulletBar';
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
  /** Reports are private: the link opens for the owner (and for everyone signed in, on demos). */
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('success', 'Link copied. Reports are private — it opens only for you when signed in.');
    } catch {
      toast('error', 'Could not copy the link.');
    }
  };

  return (
    <section id="overview" aria-labelledby="overview-heading" className="scroll-mt-24">
      <div className="glass relative overflow-hidden rounded-xl">
        <div aria-hidden className="bg-dots absolute right-6 top-6 h-24 w-24 text-primary/20" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[auto_1fr_minmax(240px,320px)] lg:items-center">
          <div className="flex justify-center">
            <ScoreRing value={report.score.overall} size={176} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">Consistency report</p>
              <Badge>
                {report.kind === 'source' ? (
                  <FileCode2 aria-hidden size={12} />
                ) : (
                  <Globe aria-hidden size={12} />
                )}
                {report.kind === 'source' ? 'Source code' : 'Website'}
              </Badge>
              {report.source?.frameworks.map((f) => (
                <Badge key={f}>{f}</Badge>
              ))}
            </div>
            <h1 id="overview-heading" className="break-all text-xl font-bold sm:text-2xl">
              {report.domain}
            </h1>
            <a
              href={report.url}
              target="_blank"
              rel="noreferrer nofollow"
              className="break-all font-mono text-sm text-muted underline hover:text-text"
            >
              {report.url}
            </a>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li className="flex items-center gap-2">
                <FileStack aria-hidden size={16} />{' '}
                {report.kind === 'source'
                  ? `${plural(report.source?.filesAnalyzed ?? report.pagesScanned.length, 'file')} analyzed`
                  : `${plural(report.pagesScanned.length, 'page')} scanned`}
              </li>
              <li className="flex items-center gap-2">
                <CalendarDays aria-hidden size={16} /> {formatDate(report.createdAt)}
              </li>
              {report.score.a11yPenalty > 0 && (
                <li className="flex items-center gap-2">
                  <ShieldAlert aria-hidden size={16} /> −{report.score.a11yPenalty} for
                  accessibility
                </li>
              )}
            </ul>
            <div className="flex flex-wrap gap-2">
              <a href="#export" className={buttonClasses('primary')}>
                <Download aria-hidden size={16} /> Export tokens
              </a>
              <Button variant="secondary" onClick={share}>
                <Link2 aria-hidden size={16} /> Copy link
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-md bg-surface/70 p-4 shadow-sm">
            <p className="text-sm font-semibold text-muted">Score breakdown · target 80</p>
            {CATEGORIES.map(([key, label, weight]) => (
              <BulletBar key={key} label={label} hint={weight} value={report.score[key]} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
