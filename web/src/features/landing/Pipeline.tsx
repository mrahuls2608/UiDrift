import { Fingerprint, Globe, Layers, Wrench } from 'lucide-react';

const STEPS = [
  {
    icon: Globe,
    title: 'Crawl',
    text: 'Headless Chrome visits up to 10 same-domain pages and respects robots.txt.',
  },
  {
    icon: Fingerprint,
    title: 'Fingerprint',
    text: 'Real computed styles for every button, input, heading, link and card.',
  },
  {
    icon: Layers,
    title: 'Group',
    text: 'Near-duplicates (≤ 2 px, ΔE < 3) merge into true variants, ranked by use.',
  },
  {
    icon: Wrench,
    title: 'Fix',
    text: 'Score, tokens and starter components built from your most used patterns.',
  },
];

export function Pipeline() {
  return (
    <section id="how" aria-labelledby="how-heading" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-content px-4 py-16 sm:py-24">
        <div className="mb-12 flex max-w-prose flex-col gap-3">
          <p className="eyebrow">How it works</p>
          <h2 id="how-heading" className="text-xl font-bold sm:text-2xl">
            From URL to design system in four steps
          </h2>
        </div>
        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span
            aria-hidden
            className="absolute left-6 right-6 top-6 hidden h-px bg-border lg:block"
          />
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative flex flex-col gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-bg text-primary">
                <Icon aria-hidden size={20} />
              </span>
              <span className="font-mono text-xs text-muted">0{i + 1}</span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
