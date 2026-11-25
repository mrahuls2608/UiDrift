'use client';

import { useEffect, useRef, useState } from 'react';
import { Fingerprint, Globe, Layers, Wrench } from 'lucide-react';
import { useReducedMotion, useSceneProgress } from '@/components/motion/use-scroll';
import { ballPose } from '@/lib/motion';
import { cn } from '@/lib/cn';

const STEPS = [
  {
    icon: Globe,
    title: 'Point it at your UI',
    text: 'A public URL, a ZIP of your repo, a GitHub link or pasted files.',
    stat: 'URL · ZIP · GitHub · paste',
  },
  {
    icon: Fingerprint,
    title: 'Fingerprint',
    text: 'Real computed styles (website) or authored styles (code) for every button, input, heading, link and card.',
    stat: '5 component types',
  },
  {
    icon: Layers,
    title: 'Group & score',
    text: 'Near-duplicates merge (≤ 2 px, ΔE < 3) and every category scores 0–100.',
    stat: '11 buttons → 3',
  },
  {
    icon: Wrench,
    title: 'Fix',
    text: 'Prioritized recommendations, design tokens and typed React components to replace the drift.',
    stat: 'tokens.css · React',
  },
];
const BALL = 64;
const RADIUS = BALL / 2;

/** Striped ball: the stripes rotate with the roll, the gloss highlight stays fixed like real light. */
function Ball({
  x,
  y,
  rotate,
  scaleX,
  scaleY,
}: {
  x: number;
  y: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}) {
  return (
    <div
      aria-hidden
      className="absolute left-0 top-0"
      style={{ transform: `translate3d(${x - RADIUS}px, ${y}px, 0)`, willChange: 'transform' }}
    >
      <div
        style={{
          width: BALL,
          height: BALL,
          transform: `scale(${scaleX}, ${scaleY})`,
          transformOrigin: '50% 100%',
        }}
      >
        <div
          className="h-full w-full rounded-full shadow-lg"
          style={{
            transform: `rotate(${rotate}deg)`,
            background:
              'conic-gradient(from 0deg, #c2185b 0 12.5%, #ffffff 0 25%, #7c3aed 0 37.5%, #ffffff 0 50%, #2563eb 0 62.5%, #ffffff 0 75%, #db2777 0 87.5%, #ffffff 0 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), rgba(255,255,255,0) 42%), radial-gradient(circle at 70% 80%, rgba(30,27,75,0.25), transparent 55%)',
          }}
        />
      </div>
    </div>
  );
}

function StaticSteps() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map(({ icon: Icon, title, text }, i) => (
        <li key={title} className="flex flex-col gap-3 rounded-md bg-surface/70 p-6 shadow-sm">
          <span className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-md">
              <Icon aria-hidden size={18} />
            </span>
            <span className="text-sm font-semibold text-muted">0{i + 1}</span>
          </span>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted">{text}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * “How it works” as a scroll scene: the section is tall, its panel is sticky, and scroll progress
 * rolls a ball along a track — hopping between the four steps and lighting each one up.
 */
export function RollingSteps() {
  const scene = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useSceneProgress(scene);
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [reduced]);

  const pose = ballPose(progress, width, RADIUS, STEPS.length);
  const step = STEPS[pose.active] ?? STEPS[0]!;

  const heading = (
    <div className="flex flex-col gap-2">
      <p className="eyebrow">How it works</p>
      <h2 id="how-heading" className="text-xl font-bold sm:text-2xl">
        From messy UI to design system in four steps
      </h2>
    </div>
  );

  if (reduced) {
    return (
      <section
        id="how"
        aria-labelledby="how-heading"
        className="glass scroll-mt-24 rounded-xl p-6 sm:p-12"
      >
        <div className="mb-8">{heading}</div>
        <StaticSteps />
      </section>
    );
  }

  return (
    <section
      ref={scene}
      id="how"
      aria-labelledby="how-heading"
      className="relative h-[260vh] scroll-mt-24"
    >
      <div className="sticky top-24 flex h-[calc(100svh-120px)] min-h-[520px] items-center">
        <div className="glass flex w-full flex-col gap-8 overflow-hidden rounded-xl p-6 sm:p-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {heading}
            <p className="text-sm text-muted" aria-hidden>
              Scroll to roll →
            </p>
          </div>

          {/* Track with four stations; the ball rolls along it. */}
          <div className="px-8">
            <div ref={track} className="relative h-24">
              <div className="absolute left-0 right-0 top-[76px] h-2 rounded-full bg-surface-2" />
              <div
                className="absolute left-0 top-[76px] h-2 rounded-full bg-brand"
                style={{ width: pose.x }}
              />
              <div
                aria-hidden
                className="absolute top-[78px] h-2 rounded-full bg-ink/20 blur-sm"
                style={{
                  width: BALL * (1 + pose.y / 80),
                  left: pose.x - (BALL * (1 + pose.y / 80)) / 2,
                }}
              />
              {STEPS.map((s, i) => {
                const lit = pose.lit[i] ?? 0;
                return (
                  <div
                    key={s.title}
                    className="absolute top-[64px] -translate-x-1/2"
                    style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border-4 border-surface text-xs font-bold shadow-md transition-colors duration-200',
                        lit >= 1 ? 'bg-brand text-white' : 'bg-surface-2 text-muted',
                      )}
                      style={{
                        transform: `scale(${1 + lit * 0.25 * (pose.active === i ? 1 : 0)})`,
                      }}
                    >
                      {i + 1}
                    </span>
                  </div>
                );
              })}
              <div className="absolute left-0 top-[12px] w-full">
                <Ball {...pose} />
              </div>
            </div>
          </div>

          {/* Step cards: all four on large screens (active one highlighted), active one on small. */}
          <ol className="grid gap-4 lg:grid-cols-4" aria-live="polite">
            {STEPS.map(({ icon: Icon, title, text, stat }, i) => {
              const active = i === pose.active;
              const reached = (pose.lit[i] ?? 0) >= 1;
              return (
                <li
                  key={title}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex-col gap-3 rounded-md p-6 transition duration-200',
                    active
                      ? 'flex bg-surface shadow-lg lg:-translate-y-2'
                      : 'hidden bg-surface/50 shadow-sm lg:flex',
                    !reached && 'lg:opacity-60',
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-colors duration-200',
                        reached ? 'bg-brand text-white' : 'bg-surface-2 text-muted',
                      )}
                    >
                      <Icon aria-hidden size={18} />
                    </span>
                    <span className="text-sm font-semibold text-muted">0{i + 1}</span>
                  </span>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="text-sm text-muted">{text}</p>
                  <p className="mt-auto text-sm font-semibold text-primary">{stat}</p>
                </li>
              );
            })}
          </ol>
          <p className="sr-only">{`Step ${pose.active + 1} of ${STEPS.length}: ${step.title}`}</p>
        </div>
      </div>
    </section>
  );
}
