import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'interactive';
  as?: 'div' | 'section' | 'article' | 'li';
}

export function Card({ variant = 'default', as: Tag = 'div', className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6',
        variant === 'interactive' &&
          'transition duration-200 hover:-translate-y-px hover:border-muted hover:shadow-md',
        className,
      )}
      {...props}
    />
  );
}
