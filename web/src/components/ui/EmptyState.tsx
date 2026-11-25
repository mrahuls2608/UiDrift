import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 glass rounded-lg px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
        <Icon aria-hidden size={24} className="text-muted" />
      </span>
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      {description && <p className="max-w-prose text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
