import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel, error, helperText, id, className, type = 'text', ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined;
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <label
        htmlFor={inputId}
        className={cn('text-sm font-medium text-text', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-12 w-full rounded-md border bg-bg px-4 text-base text-text transition duration-200 placeholder:text-muted focus:border-primary',
          error ? 'border-danger' : 'border-border hover:border-muted',
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-help`} className="text-sm text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
