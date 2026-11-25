'use client';

import { useId, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
  icon?: LucideIcon;
}

export interface SegmentedProps<T extends string> {
  legend: string;
  hideLegend?: boolean;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `cards` shows descriptions in larger tiles; `pills` is a compact switch. */
  variant?: 'pills' | 'cards';
}

/** Radio group styled as pills or cards. Native radios keep arrow-key navigation and semantics. */
export function Segmented<T extends string>({
  legend,
  hideLegend,
  options,
  value,
  onChange,
  variant = 'pills',
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={cn('mb-2 text-sm font-semibold text-text', hideLegend && 'sr-only')}>
        {legend}
      </legend>
      <div
        className={cn(
          variant === 'pills'
            ? 'inline-flex flex-wrap gap-1 self-start rounded-full bg-surface-2 p-1'
            : 'grid gap-3 sm:grid-cols-2',
        )}
      >
        {options.map((o) => {
          const checked = o.value === value;
          const Icon = o.icon;
          return (
            <label
              key={o.value}
              className={cn(
                'relative cursor-pointer transition duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                variant === 'pills'
                  ? cn(
                      'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold',
                      checked ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text',
                    )
                  : cn(
                      'flex gap-3 rounded-md border bg-surface p-4 shadow-sm',
                      checked
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/40',
                    ),
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {Icon && (
                <span
                  className={cn(
                    variant === 'cards' &&
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                    variant === 'cards' &&
                      (checked ? 'bg-brand text-white' : 'bg-surface-2 text-text'),
                  )}
                >
                  <Icon aria-hidden size={variant === 'cards' ? 18 : 16} />
                </span>
              )}
              {variant === 'cards' ? (
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-text">{o.label}</span>
                  {o.description && <span className="text-sm text-muted">{o.description}</span>}
                </span>
              ) : (
                o.label
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
