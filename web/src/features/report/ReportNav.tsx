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
    // Sections below the fold are lazy-loaded, so attach to each one as it appears.
    const observed = new Set<string>();
    const attach = () => {
      for (const [id] of REPORT_SECTIONS) {
        const el = document.getElementById(id);
        if (el && !observed.has(id)) {
          observed.add(id);
          observer.observe(el);
        }
      }
    };
    attach();
    const mutations = new MutationObserver(attach);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return (
    <nav
      aria-label="Report sections"
      className="sticky top-16 z-30 -mx-4 border-b border-border bg-bg/90 px-4 backdrop-blur lg:top-24 lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0"
    >
      <p className="mb-2 hidden px-3 font-mono text-xs uppercase tracking-wide text-muted lg:block">
        On this report
      </p>
      <ul className="flex gap-1 overflow-x-auto py-2 lg:flex-col lg:py-0">
        {REPORT_SECTIONS.map(([id, label]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? 'location' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border-l-2 px-3 text-sm transition duration-200 lg:rounded-l-none',
                active === id
                  ? 'border-primary bg-surface font-semibold text-text'
                  : 'border-transparent text-muted hover:bg-surface hover:text-text',
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
