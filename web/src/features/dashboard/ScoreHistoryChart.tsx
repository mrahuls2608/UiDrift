'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ScanDTO } from '@uidrift/shared';
import { formatDate } from '@/lib/format';

export default function ScoreHistoryChart({ domain, scans }: { domain: string; scans: ScanDTO[] }) {
  const rows = scans
    .filter((s) => s.status === 'done' && s.score !== undefined)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((s) => ({ date: formatDate(s.createdAt), score: s.score as number }));

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              stroke="var(--color-border)"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              stroke="var(--color-border)"
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text)',
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer rounded-sm text-muted hover:text-text">
          View {domain} history as a table
        </summary>
        <table className="mt-2 w-full max-w-form text-left">
          <caption className="sr-only">Score history for {domain}</caption>
          <thead>
            <tr className="border-b border-border text-muted">
              <th scope="col" className="py-1 font-medium">
                Date
              </th>
              <th scope="col" className="py-1 font-medium">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.date}-${i}`} className="border-b border-border">
                <td className="py-1">{r.date}</td>
                <td className="py-1">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
