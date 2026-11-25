import type { ReactNode } from 'react';

export function Section({
  id,
  title,
  eyebrow,
  description,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-24 flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={`${id}-heading`} className="text-xl font-bold">
          {title}
        </h2>
        {description && <p className="max-w-prose text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
