'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot, FileCode2, Globe, History, Plus, RefreshCw } from 'lucide-react';
import { scoreLabel, scoreTone, type ScanDTO } from '@uidrift/shared';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { GradientArt, type ArtPalette } from '@/components/ui/GradientArt';
import { SectionSkeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/Toast';
import { useCreateScan, useCreateSourceScan, useDemos, useMe, useMyScans } from '@/hooks/queries';
import { formatDate } from '@/lib/format';

const ScoreHistoryChart = dynamic(() => import('./ScoreHistoryChart'), {
  ssr: false,
  loading: () => <SectionSkeleton label="Loading chart" />,
});
const PALETTES: ArtPalette[] = ['aurora', 'lagoon', 'iris', 'blush'];

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

function KindLabel({ scan }: { scan: ScanDTO }) {
  const Icon = scan.kind === 'source' ? FileCode2 : Globe;
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <Icon aria-hidden size={14} />
      {scan.kind === 'source' ? 'Code' : 'Website'}
      {scan.insightsEngine === 'llm' && (
        <span title="LLM insights" className="inline-flex">
          <Bot aria-label="with LLM insights" size={14} />
        </span>
      )}
    </span>
  );
}

function DemoReports() {
  const { data, isLoading } = useDemos();
  if (isLoading) return <SectionSkeleton label="Loading demo reports" />;
  if (!data?.length) return null;
  return (
    <section aria-labelledby="demos-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="demos-heading" className="text-xl font-bold">
          Demo reports
        </h2>
        <p className="text-sm text-muted">
          Pre-run audits you can open instantly — one website and one codebase.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((d, i) => (
          <li key={d.scanId}>
            <Link
              href={`/report/${d.scanId}`}
              className="glass group flex h-full flex-col overflow-hidden rounded-lg transition duration-200 hover:-translate-y-1"
            >
              <GradientArt palette={PALETTES[i % PALETTES.length]} orb={false} className="h-24" />
              <span className="flex flex-1 flex-col gap-2 p-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{d.domain}</span>
                  <Badge tone={scoreTone(d.score)}>{d.score}</Badge>
                </span>
                <span className="inline-flex items-center gap-2 text-sm text-muted">
                  {d.kind === 'source' ? (
                    <FileCode2 aria-hidden size={14} />
                  ) : (
                    <Globe aria-hidden size={14} />
                  )}
                  {d.kind === 'source' ? 'Source-code audit' : 'Website audit'}
                  <ArrowRight
                    aria-hidden
                    size={14}
                    className="ml-auto transition duration-200 group-hover:translate-x-1"
                  />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardView() {
  const { data: user, isLoading: userLoading } = useMe();
  const scans = useMyScans(!!user);
  const rescanUrl = useCreateScan();
  const rescanRepo = useCreateSourceScan();
  const toast = useToast();
  const router = useRouter();
  const [rescanning, setRescanning] = useState<string>();

  const byDomain = useMemo(() => {
    const map = new Map<string, ScanDTO[]>();
    for (const s of scans.data ?? [])
      if (s.status === 'done') map.set(s.domain, [...(map.get(s.domain) ?? []), s]);
    return [...map.entries()];
  }, [scans.data]);

  /** Websites and GitHub repos can be re-audited in place; uploads need the files again. */
  const onRescan = (scan: ScanDTO) => {
    if (scan.kind === 'source' && !scan.url.startsWith('https://github.com/')) {
      router.push('/new');
      return;
    }
    setRescanning(scan.id);
    const handlers = {
      onSuccess: ({ scanId }: { scanId: string }) => router.push(`/scan/${scanId}`),
      onError: (err: Error) => toast('error', err.message),
      onSettled: () => setRescanning(undefined),
    };
    if (scan.kind === 'source')
      rescanRepo.mutate({ source: { type: 'github', repo: scan.url } }, handlers);
    else rescanUrl.mutate({ url: scan.url }, handlers);
  };

  if (userLoading || (user && scans.isLoading))
    return <SectionSkeleton label="Loading your audits" />;
  if (!user) return null;
  if (scans.isError) {
    return (
      <EmptyState
        icon={History}
        title="Could not load your audits"
        description={scans.error.message}
        action={<Button onClick={() => void scans.refetch()}>Retry</Button>}
      />
    );
  }

  const list = scans.data ?? [];
  const done = list.filter((s) => s.status === 'done' && s.score !== undefined);
  const latest = done[0]?.score;
  const best = done.reduce((m, s) => Math.max(m, s.score ?? 0), 0);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Dashboard</p>
          <h1 className="text-2xl font-bold">
            Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
        </div>
        <Link href="/new" className={buttonClasses('primary', 'lg')}>
          <Plus aria-hidden size={18} /> New audit
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        <li>
          <StatCard title="Audits run" value={list.length} />
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

      <section aria-labelledby="audits-heading" className="flex flex-col gap-4">
        <h2 id="audits-heading" className="text-xl font-bold">
          Your audits
        </h2>
        {list.length === 0 ? (
          <EmptyState
            icon={History}
            title="No audits yet"
            description="Audit a live website or upload your source code. Results are saved here so you can track your score over time."
            action={
              <Link href="/new" className={buttonClasses('primary')}>
                Start your first audit
              </Link>
            }
          />
        ) : (
          <Card className="overflow-x-auto p-0 sm:p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Your saved audits</caption>
              <thead>
                <tr className="border-b border-border text-muted">
                  <th scope="col" className="p-4 font-medium">
                    Target
                  </th>
                  <th scope="col" className="p-4 font-medium">
                    Type
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
                {list.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border transition duration-200 last:border-0 hover:bg-surface/60"
                  >
                    <td className="max-w-[280px] p-4">
                      <Link
                        href={s.status === 'done' ? `/report/${s.id}` : `/scan/${s.id}`}
                        className="block truncate font-semibold text-text underline-offset-2 hover:underline"
                      >
                        {s.domain}
                      </Link>
                    </td>
                    <td className="p-4">
                      <KindLabel scan={s} />
                    </td>
                    <td className="p-4">{statusCell(s)}</td>
                    <td className="p-4 text-muted">{formatDate(s.createdAt)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={rescanning === s.id}
                        onClick={() => onRescan(s)}
                        aria-label={`Audit ${s.domain} again`}
                      >
                        <RefreshCw aria-hidden size={14} /> Re-audit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {byDomain.length > 0 && (
        <section aria-labelledby="history-heading" className="flex flex-col gap-4">
          <h2 id="history-heading" className="text-xl font-bold">
            Score history
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {byDomain.map(([domain, items]) => (
              <Card key={domain}>
                <h3 className="mb-4 truncate text-base font-semibold">{domain}</h3>
                <ScoreHistoryChart domain={domain} scans={items} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <DemoReports />
    </div>
  );
}
