import type { ReactNode } from 'react';
import { Card } from './Card';
import { Badge, type BadgeTone } from './Badge';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  suggestion?: string;
  tone?: BadgeTone;
  toneLabel?: string;
}

export function StatCard({ title, value, suggestion, tone, toneLabel }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-xs uppercase tracking-wide text-muted">{title}</h3>
        {tone && toneLabel && <Badge tone={tone}>{toneLabel}</Badge>}
      </div>
      <p className="font-mono text-xl font-semibold text-text">{value}</p>
      {suggestion && <p className="text-sm text-muted">{suggestion}</p>}
    </Card>
  );
}
