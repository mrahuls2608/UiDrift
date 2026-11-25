'use client';

import Link from 'next/link';
import { scoreTone } from '@uidrift/shared';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDemos } from '@/hooks/queries';

export function DemoChips() {
  const { data, isLoading, isError } = useDemos();
  if (isError) return null;
  if (isLoading) {
    return (
      <div className="flex gap-2" role="status" aria-label="Loading demo reports">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    );
  }
  if (!data?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Try a demo report:</span>
      {data.slice(0, 4).map((d) => (
        <Link
          key={d.scanId}
          href={`/report/${d.scanId}`}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-text transition hover:border-primary"
        >
          {d.domain}
          <Badge tone={scoreTone(d.score)}>{d.score}</Badge>
        </Link>
      ))}
    </div>
  );
}
