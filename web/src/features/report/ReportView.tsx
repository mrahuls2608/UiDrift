'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FileWarning, Loader2, SearchX } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { useReport } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { ReportNav } from './ReportNav';
import { Overview } from './sections/Overview';
import { SummaryCards } from './sections/SummaryCards';

const lazy = (
  loader: () => Promise<{
    default: React.ComponentType<{ report: import('@uidrift/shared').ReportDTO }>;
  }>,
) => dynamic(loader, { loading: () => <SectionSkeleton /> });

const ComponentsSection = lazy(() => import('./sections/ComponentsSection'));
const ColorsSection = lazy(() => import('./sections/ColorsSection'));
const TypographySection = lazy(() => import('./sections/TypographySection'));
const SpacingSection = lazy(() => import('./sections/SpacingSection'));
const AccessibilitySection = lazy(() => import('./sections/AccessibilitySection'));
const ExportSection = lazy(() => import('./sections/ExportSection'));

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Loading report" className="flex flex-col gap-6">
      <div className="flex items-center gap-6 rounded-lg border border-border bg-surface p-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );
}

export function ReportView({ scanId }: { scanId: string }) {
  const { data: report, error, isLoading, refetch } = useReport(scanId);

  if (isLoading) return <ReportSkeleton />;
  if (error || !report) {
    const apiError = error instanceof ApiError ? error : null;
    if (apiError?.code === 'REPORT_NOT_READY') {
      return (
        <EmptyState
          icon={Loader2}
          title="This report is not ready yet"
          description={apiError.message}
          action={
            <Link href={`/scan/${scanId}`} className={buttonClasses('primary')}>
              View scan progress
            </Link>
          }
        />
      );
    }
    if (apiError?.status === 404 || apiError?.status === 400) {
      return (
        <EmptyState
          icon={SearchX}
          title="Report not found"
          description="It may have expired — anonymous reports are kept for 30 days."
          action={
            <Link href="/" className={buttonClasses('primary')}>
              Scan a site
            </Link>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={FileWarning}
        title="Could not load the report"
        description={apiError?.message ?? 'Something went wrong.'}
        action={
          <button type="button" className={buttonClasses('primary')} onClick={() => void refetch()}>
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
      <aside className="min-w-0">
        <ReportNav />
      </aside>
      <div className="flex min-w-0 flex-col gap-12">
        <Overview report={report} />
        <SummaryCards report={report} />
        <ComponentsSection report={report} />
        <ColorsSection report={report} />
        <TypographySection report={report} />
        <SpacingSection report={report} />
        <AccessibilitySection report={report} />
        <ExportSection report={report} />
      </div>
    </div>
  );
}
