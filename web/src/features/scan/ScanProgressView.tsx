'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Ban, SearchX } from 'lucide-react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { SectionSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCancelScan } from '@/hooks/queries';
import { useScanEvents } from '@/hooks/use-scan-events';
import { formatDateTime } from '@/lib/format';

const STEPS = ['Queued', 'Crawling', 'Extracting', 'Analysing', 'Done'];
const STEP_INDEX = {
  queued: 0,
  crawling: 1,
  analysing: 3,
  done: 4,
  failed: -1,
  cancelled: -1,
} as const;

export function ScanProgressView({ scanId }: { scanId: string }) {
  const { scan, log, mode, error } = useScanEvents(scanId);
  const cancel = useCancelScan();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (scan?.status === 'done') router.replace(`/report/${scanId}`);
  }, [scan?.status, scanId, router]);

  if (error) {
    return (
      <EmptyState
        icon={SearchX}
        title="Scan not found"
        description="This scan does not exist or has expired."
        action={
          <Link href="/" className={buttonClasses('primary')}>
            Start a new scan
          </Link>
        }
      />
    );
  }
  if (!scan) {
    return (
      <Card>
        <p className="mb-4 text-sm text-muted" role="status">
          Connecting… if the server was asleep, waking it up can take ~30 s.
        </p>
        <SectionSkeleton label="Loading scan" />
      </Card>
    );
  }

  const { pagesDone, pagesTotal, step } = scan.progress;
  const finished = ['done', 'failed', 'cancelled'].includes(scan.status);
  let current: number = STEP_INDEX[scan.status];
  if (scan.status === 'crawling' && pagesDone > 0) current = 2; // extracting styles from crawled pages
  const failedAt = Math.max(1, Math.min(3, pagesDone > 0 ? 2 : 1));
  const percent =
    scan.status === 'done'
      ? 100
      : scan.status === 'analysing'
        ? 90
        : pagesTotal
          ? Math.round((pagesDone / pagesTotal) * 80) + 5
          : 5;

  const onCancel = () =>
    cancel.mutate(scanId, {
      onSuccess: () => toast('success', 'Scan cancelled.'),
      onError: (err) => toast('error', err.message),
    });

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">Scanning</p>
          <p className="break-all text-lg font-semibold">{scan.url}</p>
          <p className="text-xs text-muted">Started {formatDateTime(scan.createdAt)}</p>
        </div>

        <ProgressSteps
          steps={STEPS}
          current={current === -1 ? failedAt : current}
          failed={current === -1}
        />

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span aria-live="polite">{step || 'Working…'}</span>
            {pagesTotal > 0 && scan.status === 'crawling' && (
              <span className="text-muted">
                page {Math.min(pagesDone + 1, pagesTotal)} of up to {pagesTotal}
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Scan progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 w-full overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {scan.status === 'failed' && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-danger p-4 text-sm text-danger"
          >
            <AlertCircle aria-hidden size={18} />
            <span>{scan.error ?? 'The scan failed.'}</span>
          </div>
        )}
        {scan.status === 'cancelled' && (
          <div role="status" className="flex items-center gap-2 text-sm text-muted">
            <Ban aria-hidden size={18} /> This scan was cancelled.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!finished && (
            <Button variant="danger" onClick={onCancel} loading={cancel.isPending}>
              Cancel scan
            </Button>
          )}
          {finished && scan.status !== 'done' && (
            <Link
              href={`/?url=${encodeURIComponent(scan.url)}`}
              className={buttonClasses('primary')}
            >
              Try again
            </Link>
          )}
        </div>
      </Card>

      <Card as="section" aria-labelledby="log-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="log-heading" className="text-base font-semibold">
            Live log
          </h2>
          <span className="text-xs text-muted">
            {mode === 'live' ? 'Live' : mode === 'polling' ? 'Updating every 3 s' : 'Connecting'}
          </span>
        </div>
        {log.length === 0 ? (
          <p className="text-sm text-muted">Waiting for the first event…</p>
        ) : (
          <ol className="flex flex-col gap-2" aria-live="polite">
            {log.map((e) => (
              <li key={`${e.at}-${e.type}-${e.message}`} className="flex gap-3 text-sm">
                <time className="shrink-0 font-mono text-xs text-muted" dateTime={e.at}>
                  {new Date(e.at).toLocaleTimeString()}
                </time>
                <span className="break-all">{e.message}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
