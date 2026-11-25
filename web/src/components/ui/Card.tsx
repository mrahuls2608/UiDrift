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
        'glass rounded-lg p-4 sm:p-6',
        variant === 'interactive' && 'transition duration-200 hover:-translate-y-1',
        className,
      )}
      {...props}
    />
  );
}
