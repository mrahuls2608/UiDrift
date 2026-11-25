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
      <span className="text-sm text-muted">Or open a demo report:</span>
      {data.slice(0, 4).map((d) => (
        <Link
          key={d.scanId}
          href={`/report/${d.scanId}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 font-mono text-sm text-text transition duration-200 hover:border-primary"
        >
          {d.domain}
          <Badge tone={scoreTone(d.score)}>{d.score}</Badge>
        </Link>
      ))}
    </div>
  );
}
