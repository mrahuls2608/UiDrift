'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Bot,
  FileCode2,
  Globe,
  LineChart,
  ListChecks,
  PackageOpen,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { GradientArt, type ArtPalette } from '@/components/ui/GradientArt';

const FEATURES: Array<{
  icon: typeof Boxes;
  title: string;
  text: string;
  palette: ArtPalette;
  meter: number;
}> = [
  {
    icon: LineChart,
    title: 'Advanced analysis',
    text: 'Fingerprints every component and merges near-duplicates.',
    palette: 'iris',
    meter: 62,
  },
  {
    icon: PackageOpen,
    title: 'Simple exports',
    text: 'tokens.css, tokens.json and typed React components.',
    palette: 'lagoon',
    meter: 58,
  },
  {
    icon: Accessibility,
    title: 'Accessibility checks',
    text: 'Contrast, labels, alt text, focus and more.',
    palette: 'blush',
    meter: 74,
  },
  {
    icon: Bot,
    title: 'Bring your own LLM',
    text: 'Optional Claude or OpenAI insights with your own key.',
    palette: 'aurora',
    meter: 45,
  },
  {
    icon: FileCode2,
    title: 'Source-code audits',
    text: 'CSS, SCSS, Tailwind, JSX, Vue and Svelte — no browser.',
    palette: 'lagoon',
    meter: 81,
  },
  {
    icon: ListChecks,
    title: 'Score history',
    text: 'Re-audit after each release and watch the trend.',
    palette: 'iris',
    meter: 69,
  },
];

const STATS = [
  { icon: Boxes, value: '5', label: 'Component types' },
  { icon: ShieldCheck, value: '100%', label: 'Deterministic' },
  { icon: Sparkles, value: '0', label: 'LLMs required' },
];

export function Benefits() {
  const [start, setStart] = useState(0);
  const visible = [FEATURES[start % FEATURES.length]!, FEATURES[(start + 1) % FEATURES.length]!];
  const move = (d: number) => setStart((s) => (s + d + FEATURES.length) % FEATURES.length);

  return (
    <section
      id="features"
      aria-labelledby="benefits-heading"
      className="glass grid scroll-mt-24 overflow-hidden rounded-xl lg:grid-cols-[1fr_2fr]"
    >
      <div className="flex flex-col gap-6 border-border p-6 sm:p-12 lg:border-r">
        <h2 id="benefits-heading" className="text-xl font-bold">
          Key benefits
        </h2>
        <p className="text-muted">
          Everything a team needs to measure UI drift and start a design system — with or without
          AI.
        </p>
        <span aria-hidden className="h-1 w-12 rounded-full bg-brand" />
        <ul className="grid grid-cols-2 gap-4">
          <li className="flex flex-col gap-2 rounded-md bg-mint p-4 text-mint-ink shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">
              <Globe aria-hidden size={18} />
            </span>
            <span className="text-sm font-bold">Website audits</span>
            <span className="text-xs">Real computed styles from up to 10 pages.</span>
          </li>
          <li className="flex flex-col gap-2 rounded-md bg-blush p-4 text-blush-ink shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">
              <FileCode2 aria-hidden size={18} />
            </span>
            <span className="text-sm font-bold">Code audits</span>
            <span className="text-xs">ZIP, GitHub repo or pasted files.</span>
          </li>
        </ul>
        <Link href="/signup" className={buttonClasses('secondary', 'md', 'self-start')}>
          Explore all features <ArrowRight aria-hidden size={16} />
        </Link>
      </div>

      <div className="flex flex-col gap-6 p-6 sm:p-12">
        <div className="flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-3 text-lg font-semibold">
            Everything you need
            <span aria-hidden className="h-6 w-6 rounded-full bg-brand opacity-80 shadow-md" />
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous features"
              className={buttonClasses('secondary', 'sm', 'w-11 px-0')}
            >
              <ArrowLeft aria-hidden size={16} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next features"
              className={buttonClasses('secondary', 'sm', 'w-11 px-0')}
            >
              <ArrowRight aria-hidden size={16} />
            </button>
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2" aria-live="polite">
          {visible.map((f, i) => (
            <li key={`${f.title}-${start}`} className={i === 1 ? 'hidden sm:block' : ''}>
              <article
                className="reveal flex h-full flex-col gap-4 rounded-md bg-surface/60 p-3 shadow-sm"
                style={{ '--i': i } as React.CSSProperties}
              >
                <div className="relative overflow-hidden rounded-md">
                  <GradientArt
                    palette={f.palette}
                    orb={false}
                    dots={false}
                    className="h-[160px] w-full"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end gap-1 p-4">
                    <span className="mb-auto flex h-12 w-12 items-center justify-center self-center rounded-full bg-white/80 text-ink shadow-md">
                      <f.icon aria-hidden size={20} />
                    </span>
                    <h4 className="text-base font-semibold text-ink">{f.title}</h4>
                  </div>
                </div>
                <p className="px-1 text-sm text-muted">{f.text}</p>
                <div
                  aria-hidden
                  className="mx-1 mb-1 h-2 overflow-hidden rounded-full bg-surface-2"
                >
                  <div className="h-full rounded-full bg-brand" style={{ width: `${f.meter}%` }} />
                </div>
              </article>
            </li>
          ))}
        </ul>
        <ul className="grid grid-cols-1 gap-4 rounded-md bg-surface/70 p-4 shadow-sm sm:grid-cols-3">
          {STATS.map(({ icon: Icon, value, label }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2">
                <Icon aria-hidden size={18} />
              </span>
              <span className="flex flex-col">
                <span className="text-lg font-bold">{value}</span>
                <span className="text-xs text-muted">{label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
