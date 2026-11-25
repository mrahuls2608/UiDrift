'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ValueCount } from '@uidrift/shared';

export interface DistributionChartProps {
  data: ValueCount[];
  label: string;
  /** Sort bars by numeric value (font sizes, spacing) instead of by usage. */
  numeric?: boolean;
  limit?: number;
}

export default function DistributionChart({
  data,
  label,
  numeric = true,
  limit = 20,
}: DistributionChartProps) {
  const rows = [...data.slice(0, limit)].sort((a, b) =>
    numeric ? parseFloat(a.value) - parseFloat(b.value) : b.count - a.count,
  );
  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="value"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              stroke="var(--color-border)"
              interval={0}
              angle={rows.length > 10 ? -45 : 0}
              textAnchor={rows.length > 10 ? 'end' : 'middle'}
              height={rows.length > 10 ? 48 : 24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              stroke="var(--color-border)"
            />
            <Tooltip
              cursor={{ fill: 'var(--color-surface)' }}
              contentStyle={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text)',
              }}
            />
            <Bar
              dataKey="count"
              name="Uses"
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer rounded-sm text-muted hover:text-text">
          View {label} as a table
        </summary>
        <table className="mt-2 w-full max-w-form text-left">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="border-b border-border text-muted">
              <th scope="col" className="py-1 font-medium">
                Value
              </th>
              <th scope="col" className="py-1 font-medium">
                Uses
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.value} className="border-b border-border">
                <td className="py-1 font-mono">{d.value}</td>
                <td className="py-1">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
