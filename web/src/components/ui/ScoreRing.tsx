'use client';

import { useEffect, useState } from 'react';
import { scoreLabel, scoreTone } from '@uidrift/shared';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const TONE_VAR = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
};
const ICONS = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

export interface ScoreRingProps {
  value: number;
  size?: number;
  showLabel?: boolean;
}

/** Animated 0–100 ring. Color is never the only signal: the label and an icon are always shown. */
export function ScoreRing({ value, size = 160, showLabel = true }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const stroke = Math.max(6, size / 14);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const tone = scoreTone(clamped);
  const Icon = ICONS[tone];
  const label = scoreLabel(clamped);

  return (
    <div
      className="inline-flex flex-col items-center gap-2"
      role="img"
      aria-label={`Consistency score ${clamped} out of 100: ${label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_VAR[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0, 0, 0.2, 1)' }}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="var(--color-text)"
          style={{ fontSize: size / 3.2, fontWeight: 700 }}
        >
          {clamped}
        </text>
      </svg>
      {showLabel && (
        <span
          className="inline-flex items-center gap-1 text-sm font-semibold"
          style={{ color: TONE_VAR[tone] }}
        >
          <Icon aria-hidden size={16} />
          {label}
        </span>
      )}
    </div>
  );
}
