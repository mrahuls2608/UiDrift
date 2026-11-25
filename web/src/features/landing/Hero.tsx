import Link from 'next/link';
import { ArrowRight, Code2, Lock, PlayCircle, Sparkles } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { GradientArt } from '@/components/ui/GradientArt';
import { ServerWake } from '@/features/scan/ServerWake';

const HIGHLIGHTS = [
  { icon: Code2, title: 'Website or code', text: 'URL, ZIP, GitHub' },
  { icon: Sparkles, title: 'No AI required', text: 'Bring your own LLM' },
  { icon: Lock, title: 'Private', text: 'Login-only reports' },
];

export function Hero() {
  return (
    <section className="glass pop grid gap-8 overflow-hidden rounded-xl p-6 sm:p-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
      <div className="flex flex-col items-start gap-6">
        <ServerWake />
        <p className="pop eyebrow">Built for consistent products</p>
        <h1
          className="pop text-2xl font-bold sm:text-3xl"
          style={{ '--i': 1 } as React.CSSProperties}
        >
          Find the UI drift hiding in your product.
        </h1>
        <p
          className="pop max-w-prose text-base text-muted sm:text-lg"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          UIDrift audits a live website or its source code, groups near-duplicate buttons, colors
          and spacing, scores consistency from 0 to 100, and generates the design tokens and React
          components to fix it.
        </p>
        <div className="pop flex flex-wrap gap-3" style={{ '--i': 3 } as React.CSSProperties}>
          <Link href="/signup" className={buttonClasses('primary', 'lg')}>
            Start your free audit <ArrowRight aria-hidden size={18} />
          </Link>
          <a href="#demo" className={buttonClasses('secondary', 'lg')}>
            <PlayCircle aria-hidden size={18} /> Watch the demo
          </a>
        </div>
        <ul
          className="pop grid w-full grid-cols-1 gap-4 pt-2 sm:grid-cols-3"
          style={{ '--i': 4 } as React.CSSProperties}
        >
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-text shadow-sm">
                <Icon aria-hidden size={18} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pop relative" style={{ '--i': 2 } as React.CSSProperties}>
        <GradientArt
          palette="aurora"
          className="aspect-[4/5] w-full rounded-lg shadow-lg sm:aspect-[5/6]"
        />
        <div
          aria-hidden
          className="glass pop-bounce absolute -left-4 bottom-12 flex items-center gap-3 rounded-md px-4 py-3 sm:-left-8"
          style={{ '--i': 6 } as React.CSSProperties}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-warning text-base font-bold">
            61
          </span>
          <span className="flex flex-col text-sm">
            <span className="font-semibold">Consistency score</span>
            <span className="text-warning">Drifting</span>
          </span>
        </div>
        <div
          aria-hidden
          className="glass pop-bounce absolute right-4 top-6 rounded-full px-4 py-2 text-sm font-semibold sm:-right-4"
          style={{ '--i': 8 } as React.CSSProperties}
        >
          11 buttons → <span className="text-brand">3</span>
        </div>
      </div>
    </section>
  );
}
