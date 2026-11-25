import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helperText, options, id, className, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <label htmlFor={selectId} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-describedby={helperText ? `${selectId}-help` : undefined}
          className="h-12 w-full cursor-pointer appearance-none rounded-md border border-border bg-surface pl-4 pr-12 text-base text-text shadow-sm transition duration-200 hover:border-muted focus:border-primary"
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          size={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
      {helperText && (
        <p id={`${selectId}-help`} className="text-sm text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});
