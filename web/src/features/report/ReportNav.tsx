'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export const REPORT_SECTIONS = [
  ['overview', 'Overview'],
  ['summary', 'Summary'],
  ['components', 'Components'],
  ['colors', 'Colors'],
  ['typography', 'Typography'],
  ['spacing', 'Spacing & Radius'],
  ['accessibility', 'Accessibility'],
  ['export', 'Export'],
] as const;

/** Sticky sidebar on desktop, horizontal tab bar on mobile (DESIGN §7). Highlights the visible section. */
export function ReportNav() {
  const [active, setActive] = useState<string>('overview');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-64px 0px -60% 0px' },
    );
    for (const [id] of REPORT_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Report sections"
      className="sticky top-0 z-10 -mx-4 border-b border-border bg-bg px-4 lg:top-6 lg:mx-0 lg:border-0 lg:px-0"
    >
      <ul className="flex gap-1 overflow-x-auto py-2 lg:flex-col lg:py-0">
        {REPORT_SECTIONS.map(([id, label]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? 'location' : undefined}
              className={cn(
                'block whitespace-nowrap rounded-sm px-3 py-2 text-sm transition',
                active === id ? 'bg-surface font-semibold text-text' : 'text-muted hover:text-text',
              )}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
