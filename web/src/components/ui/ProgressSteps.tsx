import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ProgressStepsProps {
  steps: string[];
  current: number;
  failed?: boolean;
}

export function ProgressSteps({ steps, current, failed = false }: ProgressStepsProps) {
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Scan steps">
      {steps.map((step, i) => {
        const state =
          i < current ? 'complete' : i === current ? (failed ? 'failed' : 'current') : 'upcoming';
        return (
          <li
            key={step}
            className="flex items-center gap-2 text-sm"
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span
              aria-hidden
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold',
                state === 'complete' && 'border-success bg-success text-bg',
                state === 'current' && 'border-primary text-primary',
                state === 'failed' && 'border-danger text-danger',
                state === 'upcoming' && 'border-border text-muted',
              )}
            >
              {state === 'complete' ? <Check size={14} /> : i + 1}
            </span>
            <span
              className={cn(
                state === 'upcoming' ? 'text-muted' : 'text-text',
                state === 'current' && 'font-semibold',
              )}
            >
              {step}
              <span className="sr-only"> ({state})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
