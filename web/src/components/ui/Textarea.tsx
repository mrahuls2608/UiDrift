import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className, ...props },
  ref,
) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <label htmlFor={areaId} className="text-sm font-medium text-text">
        {label}
      </label>
      <textarea
        ref={ref}
        id={areaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${areaId}-error` : undefined}
        className={cn(
          'min-h-[192px] w-full rounded-md border bg-surface p-4 font-mono text-sm text-text shadow-sm transition duration-200 placeholder:text-muted focus:border-primary',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      />
      {error && (
        <p id={`${areaId}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
