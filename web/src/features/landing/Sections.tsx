import Link from 'next/link';
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { buttonClasses } from '@/components/ui/Button';
import { GradientArt } from '@/components/ui/GradientArt';

export function DemoVideo() {
  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="glass scroll-mt-24 rounded-xl p-6 sm:p-12"
    >
      <div className="mb-6 flex flex-col gap-2">
        <p className="eyebrow">90-second tour</p>
        <h2 id="demo-heading" className="text-xl font-bold sm:text-2xl">
          See an audit from start to finish
        </h2>
      </div>
      <video
        className="aspect-video w-full rounded-lg bg-surface-2 shadow-lg"
        controls
        preload="none"
        playsInline
        poster="/demo/poster.jpg"
        aria-describedby="demo-caption"
      >
        <source src="/demo/uidrift-demo.mp4" type="video/mp4" />
      </video>
      <p id="demo-caption" className="mt-3 text-sm text-muted">
        Sign in → audit a website or a codebase → live progress → consistency report → exported
        tokens and components.
      </p>
    </section>
  );
}

const PROMISES = [
  {
    icon: ShieldCheck,
    title: 'Deterministic by default',
    text: 'Scores, groups, tokens and recommendations come from code, not a model. Same input, same result.',
  },
  {
    icon: Sparkles,
    title: 'AI is optional',
    text: 'Add your own Claude, OpenAI or compatible key per audit to rewrite the insights. Results never depend on it.',
  },
  {
    icon: KeyRound,
    title: 'Your key stays yours',
    text: 'Typed in the form, encrypted for at most 15 minutes, used once and deleted. Never stored or read from server config.',
  },
];

export function Privacy() {
  return (
    <section
      id="security"
      aria-labelledby="privacy-heading"
      className="glass grid scroll-mt-24 gap-8 overflow-hidden rounded-xl p-6 sm:p-12 lg:grid-cols-[1fr_1.2fr] lg:items-center"
    >
      <Reveal variant="left" className="hidden h-full lg:block">
        <GradientArt palette="lagoon" className="h-full min-h-[320px] rounded-lg" />
      </Reveal>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Works with or without AI</p>
          <h2 id="privacy-heading" className="text-xl font-bold sm:text-2xl">
            The same great result, LLM or no LLM
          </h2>
        </div>
        <ul className="flex flex-col gap-4">
          {PROMISES.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" variant="right" delay={i * 120} key={title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-sm">
                <Icon aria-hidden size={18} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="relative overflow-hidden rounded-xl bg-brand p-8 text-white shadow-lg sm:p-12"
    >
      <div aria-hidden className="bg-dots absolute right-8 top-8 h-24 w-24 text-white/40" />
      <div className="relative flex flex-col items-start gap-6">
        <h2 id="cta-heading" className="max-w-prose text-xl font-bold sm:text-2xl">
          How many button styles does your product really have?
        </h2>
        <p className="max-w-prose text-white/90">
          Create a free account and run your first audit in under a minute.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-ink shadow-md transition duration-200 hover:shadow-lg"
          >
            Get started free <ArrowRight aria-hidden size={18} />
          </Link>
          <Link
            href="/login"
            className={buttonClasses(
              'ghost',
              'lg',
              'text-white hover:bg-white/15 hover:text-white',
            )}
          >
            I have an account
          </Link>
        </div>
      </div>
    </section>
  );
}
