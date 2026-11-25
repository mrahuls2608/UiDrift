'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, RefreshCw, Plus } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { scoreLabel, scoreTone, type ScanDTO } from '@uidrift/shared';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCreateScan, useMe, useMyScans } from '@/hooks/queries';
import { formatDate } from '@/lib/format';

const ScoreHistoryChart = dynamic(() => import('./ScoreHistoryChart'), {
  ssr: false,
  loading: () => <SectionSkeleton label="Loading chart" />,
});

function statusCell(scan: ScanDTO) {
  if (scan.status === 'done' && scan.score !== undefined) {
    return (
      <Badge tone={scoreTone(scan.score)}>
        {scan.score} · {scoreLabel(scan.score)}
      </Badge>
    );
  }
  if (scan.status === 'failed') return <Badge tone="danger">Failed</Badge>;
  if (scan.status === 'cancelled') return <Badge>Cancelled</Badge>;
  return <Badge tone="warning">In progress</Badge>;
}

export function DashboardView() {
  const { data: user, isLoading: userLoading } = useMe();
  const scans = useMyScans(!!user);
  const rescan = useCreateScan();
  const toast = useToast();
  const router = useRouter();
  const [rescanning, setRescanning] = useState<string>();

  useEffect(() => {
    if (!userLoading && !user) router.replace('/login');
  }, [user, userLoading, router]);

  const byDomain = useMemo(() => {
    const map = new Map<string, ScanDTO[]>();
    for (const s of scans.data ?? []) map.set(s.domain, [...(map.get(s.domain) ?? []), s]);
    return [...map.entries()].filter(
      ([, list]) => list.filter((s) => s.status === 'done').length >= 1,
    );
  }, [scans.data]);

  const onRescan = (scan: ScanDTO) => {
    setRescanning(scan.id);
    rescan.mutate(
      { url: scan.url },
      {
        onSuccess: ({ scanId }) => router.push(`/scan/${scanId}`),
        onError: (err) => toast('error', err.message),
        onSettled: () => setRescanning(undefined),
      },
    );
  };

  if (userLoading || (user && scans.isLoading))
    return <SectionSkeleton label="Loading your scans" />;
  if (!user) return null;
  if (scans.isError) {
    return (
      <EmptyState
        icon={History}
        title="Could not load your scans"
        description={scans.error.message}
        action={<Button onClick={() => void scans.refetch()}>Retry</Button>}
      />
    );
  }
  if (!scans.data?.length) {
    return (
      <EmptyState
        icon={History}
        title="No scans yet"
        description="Scans you run while logged in are saved here so you can track your score over time."
        action={
          <Link href="/" className={buttonClasses('primary')}>
            Scan a site
          </Link>
        }
      />
    );
  }

  const done = scans.data.filter((s) => s.status === 'done' && s.score !== undefined);
  const latest = done[0]?.score;
  const best = done.reduce((m, s) => Math.max(m, s.score ?? 0), 0);
  const domains = new Set(scans.data.map((s) => s.domain)).size;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ul className="grid flex-1 gap-4 sm:grid-cols-3">
          <li>
            <StatCard title="Sites tracked" value={domains} />
          </li>
          <li>
            <StatCard
              title="Latest score"
              value={latest ?? '—'}
              tone={latest === undefined ? undefined : scoreTone(latest)}
              toneLabel={latest === undefined ? undefined : scoreLabel(latest)}
            />
          </li>
          <li>
            <StatCard title="Best score" value={done.length ? best : '—'} />
          </li>
        </ul>
      </div>
      <div className="flex justify-end">
        <Link href="/" className={buttonClasses('primary')}>
          <Plus aria-hidden size={16} /> New scan
        </Link>
      </div>
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Your saved scans</caption>
          <thead>
            <tr className="border-b border-border font-mono text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="p-4 font-medium">
                Site
              </th>
              <th scope="col" className="p-4 font-medium">
                Score
              </th>
              <th scope="col" className="p-4 font-medium">
                Date
              </th>
              <th scope="col" className="p-4 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {scans.data.map((s) => (
              <tr
                key={s.id}
                className="border-b border-border transition duration-200 last:border-0 hover:bg-surface-2"
              >
                <td className="p-4">
                  <Link
                    href={s.status === 'done' ? `/report/${s.id}` : `/scan/${s.id}`}
                    className="font-medium text-text underline-offset-2 hover:underline"
                  >
                    {s.domain}
                  </Link>
                </td>
                <td className="p-4">{statusCell(s)}</td>
                <td className="p-4 text-muted">{formatDate(s.createdAt)}</td>
                <td className="p-4 text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={rescanning === s.id}
                    onClick={() => onRescan(s)}
                    aria-label={`Re-scan ${s.domain}`}
                  >
                    <RefreshCw aria-hidden size={14} /> Re-scan
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <section aria-labelledby="history-heading" className="flex flex-col gap-4">
        <h2 id="history-heading" className="text-xl font-bold">
          Score history
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {byDomain.map(([domain, list]) => (
            <Card key={domain}>
              <h3 className="mb-4 text-base font-semibold">{domain}</h3>
              <ScoreHistoryChart domain={domain} scans={list} />
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
