import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GradientArt } from '@/components/ui/GradientArt';
import { Reveal } from '@/components/motion/Reveal';

export function Gallery() {
  return (
    <section
      aria-labelledby="gallery-heading"
      className="glass grid gap-4 rounded-xl p-4 sm:grid-cols-3 sm:p-6"
    >
      <Reveal variant="pop" className="flex">
        <GradientArt
          palette="blush"
          className="h-[192px] w-full rounded-md sm:h-auto"
          orb={false}
        />
      </Reveal>
      <Reveal
        variant="pop"
        delay={140}
        className="flex flex-col justify-between gap-6 rounded-md bg-surface/70 p-6 shadow-sm"
      >
        <div className="flex flex-col gap-2">
          <h2 id="gallery-heading" className="text-lg font-bold">
            Your design system, generated
          </h2>
          <p className="text-sm text-muted">
            The most used values become tokens.css, tokens.json and typed React components.
          </p>
        </div>
        <Link
          href="/signup"
          aria-label="Create an account to generate your design system"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-md transition duration-200 hover:shadow-lg"
        >
          <ArrowRight aria-hidden size={18} />
        </Link>
      </Reveal>
      <Reveal variant="pop" delay={280} className="flex">
        <GradientArt palette="iris" className="h-[192px] w-full rounded-md sm:h-auto" orb={false} />
      </Reveal>
    </section>
  );
}
