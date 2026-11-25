import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GradientArt } from '@/components/ui/GradientArt';

export function Gallery() {
  return (
    <section
      aria-labelledby="gallery-heading"
      className="glass grid gap-4 rounded-xl p-4 sm:grid-cols-3 sm:p-6"
    >
      <GradientArt palette="blush" className="h-[192px] rounded-md sm:h-auto" orb={false} />
      <div className="flex flex-col justify-between gap-6 rounded-md bg-surface/70 p-6 shadow-sm">
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
      </div>
      <GradientArt palette="iris" className="h-[192px] rounded-md sm:h-auto" orb={false} />
    </section>
  );
}
