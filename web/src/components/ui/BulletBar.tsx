import { scoreLabel, scoreTone } from '@uidrift/shared';

const TONE_VAR = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
};

export interface BulletBarProps {
  label: string;
  value: number;
  /** Target marker position (0–100). Defaults to 80, the "Consistent" threshold. */
  target?: number;
  hint?: string;
}

/**
 * Compact bullet chart for a 0–100 score: qualitative bands (0–49 / 50–79 / 80–100),
 * a value bar and a target marker. The number and label are always shown as text.
 */
export function BulletBar({ label, value, target = 80, hint }: BulletBarProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tone = scoreTone(v);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">
          {label}
          {hint && <span className="ml-1 font-mono text-xs">{hint}</span>}
        </span>
        <span className="font-mono text-sm font-semibold" style={{ color: TONE_VAR[tone] }}>
          {v}
          <span className="sr-only"> out of 100, {scoreLabel(v)}</span>
        </span>
      </div>
      <div aria-hidden className="relative h-2 overflow-hidden rounded-full bg-surface-2">
        <span className="absolute inset-y-0 left-0 w-1/2 bg-danger/15" />
        <span className="absolute inset-y-0 left-1/2 w-[30%] bg-warning/15" />
        <span className="absolute inset-y-0 right-0 w-1/5 bg-success/15" />
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
          style={{ width: `${v}%`, background: TONE_VAR[tone] }}
        />
        <span className="absolute inset-y-0 w-px bg-text" style={{ left: `${target}%` }} />
      </div>
    </div>
  );
}
