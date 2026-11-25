import { Accessibility, Boxes, Code2, Palette } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const BUTTON_DRIFT = [
  { r: 6, p: '8px 16px', w: 600 },
  { r: 8, p: '10px 18px', w: 600 },
  { r: 4, p: '8px 14px', w: 500 },
  { r: 999, p: '8px 16px', w: 600 },
  { r: 2, p: '12px 20px', w: 700 },
  { r: 6, p: '6px 12px', w: 500 },
  { r: 10, p: '9px 16px', w: 600 },
  { r: 0, p: '8px 16px', w: 400 },
];

const COLOR_PAIRS = [
  ['#22c55e', '#21c45d', '#23c75f'],
  ['#818cf8', '#7f8bf7'],
  ['#f87171', '#f77070', '#f97272'],
  ['#94a3b8', '#93a2b7'],
];

function FeatureHead({
  icon: Icon,
  eyebrow,
  title,
  text,
}: {
  icon: typeof Boxes;
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow flex items-center gap-2">
        <Icon aria-hidden size={16} />
        {eyebrow}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mx-auto max-w-content px-4 py-16 sm:py-24"
    >
      <div className="mb-12 flex max-w-prose flex-col gap-3">
        <p className="eyebrow">What you get</p>
        <h2 id="features-heading" className="text-xl font-bold sm:text-2xl">
          See the drift. Measure it. Ship the fix.
        </h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-6 lg:col-span-2">
          <FeatureHead
            icon={Boxes}
            eyebrow="Component groups"
            title="Every variant, side by side"
            text="Buttons, inputs, headings, links and cards are fingerprinted from their computed styles. Near-duplicates within 2 px merge, and the most used become your suggested standards."
          />
          <div
            aria-hidden
            className="grid grid-cols-2 gap-3 rounded-md border border-border bg-bg p-4 sm:grid-cols-4"
          >
            {BUTTON_DRIFT.map((b, i) => (
              <span
                key={i}
                className="reveal flex items-center justify-center bg-primary text-xs text-on-primary"
                style={
                  {
                    borderRadius: b.r,
                    padding: b.p,
                    fontWeight: b.w,
                    '--i': i,
                  } as React.CSSProperties
                }
              >
                Get started
              </span>
            ))}
          </div>
          <p className="font-mono text-sm">
            <span className="text-danger">8 button variants</span>{' '}
            <span className="text-muted">→ suggest</span> <span className="text-primary">3</span>
          </p>
        </Card>
        <Card className="flex flex-col gap-6">
          <FeatureHead
            icon={Palette}
            eyebrow="Color sprawl"
            title="Shades that should be one"
            text="Text, background and border colors are clustered with CIEDE2000. Anything under ΔE 3 is the same color to a human eye."
          />
          <ul aria-hidden className="flex flex-col gap-3">
            {COLOR_PAIRS.map((group) => (
              <li key={group[0]} className="flex items-center gap-3">
                <span className="flex -space-x-2">
                  {group.map((c) => (
                    <span
                      key={c}
                      className="h-6 w-6 rounded-full border-2 border-surface"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="font-mono text-xs text-muted">
                  {group.length} → <span className="text-text">{group[0]}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col gap-6">
          <FeatureHead
            icon={Accessibility}
            eyebrow="Accessibility"
            title="Contrast and labels, checked"
            text="axe-core runs on every page. Serious and critical WCAG 2.1 AA violations are listed with the element, the page and a fix."
          />
          <ul aria-hidden className="flex flex-col gap-2 font-mono text-xs">
            <li className="flex justify-between rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-danger">
              color-contrast <span>serious</span>
            </li>
            <li className="flex justify-between rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-danger">
              image-alt <span>critical</span>
            </li>
            <li className="flex justify-between rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-warning">
              label <span>moderate</span>
            </li>
          </ul>
        </Card>
        <Card className="flex flex-col gap-6 lg:col-span-2">
          <FeatureHead
            icon={Code2}
            eyebrow="Export"
            title="Tokens and components, generated"
            text="The most used values become tokens.css and tokens.json. Starter Button, Input, Card and Heading components are typed React that compiles out of the box."
          />
          <div aria-hidden className="grid gap-3 sm:grid-cols-2">
            <pre className="overflow-hidden rounded-md border border-border bg-bg p-4 font-mono text-xs leading-relaxed">
              <span className="text-muted">/* tokens.css */</span>
              {'\n'}:root {'{'}
              {'\n'} <span className="text-accent">--color-primary</span>: #22c55e;
              {'\n'} <span className="text-accent">--font-size-base</span>: 16px;
              {'\n'} <span className="text-accent">--space-4</span>: 16px;
              {'\n'} <span className="text-accent">--radius-md</span>: 8px;
              {'\n'}
              {'}'}
            </pre>
            <pre className="overflow-hidden rounded-md border border-border bg-bg p-4 font-mono text-xs leading-relaxed">
              <span className="text-muted">{'// Button.tsx'}</span>
              {'\n'}
              <span className="text-accent">export function</span> Button({'{'} variant {'}'}) {'{'}
              {'\n'} <span className="text-accent">return</span> {'<button'}
              {'\n'} style={'{'}variants[variant]{'}'}
              {'\n'} {'/>'};{'\n'}
              {'}'}
            </pre>
          </div>
        </Card>
      </div>
    </section>
  );
}
