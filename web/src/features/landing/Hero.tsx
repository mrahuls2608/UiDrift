import { ShieldCheck, Timer, Zap } from 'lucide-react';
import { ScanForm } from '@/features/scan/ScanForm';
import { DemoChips } from '@/features/scan/DemoChips';
import { ServerWake } from '@/features/scan/ServerWake';
import { HeroMockup } from './HeroMockup';

const TRUST = [
  { icon: Zap, text: 'Free, no signup' },
  { icon: Timer, text: '10 pages in under 90 s' },
  { icon: ShieldCheck, text: 'Public pages only' },
];

export function Hero({ initialUrl }: { initialUrl: string }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div className="relative mx-auto grid max-w-content gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="flex flex-col items-start gap-6">
          <ServerWake />
          <p className="reveal eyebrow inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
            UI consistency audit
          </p>
          <h1
            className="reveal text-2xl font-bold sm:text-3xl lg:text-4xl"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            Find the <span className="text-primary">UI drift</span> hiding in your website
          </h1>
          <p
            className="reveal max-w-prose text-base text-muted sm:text-lg"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            UIDrift crawls your site, groups near-duplicate buttons, colors and spacing, scores
            consistency from 0 to 100, and generates design tokens and React components to fix it.
          </p>
          <div className="reveal w-full" style={{ '--i': 3 } as React.CSSProperties}>
            <ScanForm initialUrl={initialUrl} />
          </div>
          <ul
            className="reveal flex flex-wrap gap-x-6 gap-y-2"
            style={{ '--i': 4 } as React.CSSProperties}
          >
            {TRUST.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm text-muted">
                <Icon aria-hidden size={16} className="text-primary" />
                {text}
              </li>
            ))}
          </ul>
          <DemoChips />
        </div>
        <div className="reveal" style={{ '--i': 2 } as React.CSSProperties}>
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
