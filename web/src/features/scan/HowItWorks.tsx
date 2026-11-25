import { Fingerprint, Globe, Layers, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const STEPS = [
  {
    icon: Globe,
    title: 'Crawl',
    text: 'Headless Chrome visits up to 10 same-domain pages and respects robots.txt.',
  },
  {
    icon: Fingerprint,
    title: 'Fingerprint',
    text: 'Every button, input, heading, link and card is captured with its real computed styles.',
  },
  {
    icon: Layers,
    title: 'Group',
    text: 'Near-duplicates (≤2 px, ΔE < 3) are merged so you see the true variant count.',
  },
  {
    icon: Wrench,
    title: 'Fix',
    text: 'Export design tokens and starter React components built from the most used patterns.',
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-content px-4 py-16">
      <h2 id="how-heading" className="mb-8 text-xl font-bold">
        How it works
      </h2>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <Card as="li" key={title} className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Icon aria-hidden size={20} />
              Step {i + 1}
            </span>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted">{text}</p>
          </Card>
        ))}
      </ol>
    </section>
  );
}
