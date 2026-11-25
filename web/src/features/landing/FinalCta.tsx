import { ScanForm } from '@/features/scan/ScanForm';

export function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="mx-auto max-w-content px-4 py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-surface p-8 sm:p-12">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative flex flex-col items-start gap-6">
          <p className="eyebrow">Run your first audit</p>
          <h2 id="cta-heading" className="max-w-prose text-xl font-bold sm:text-2xl">
            How many button styles does your site really have?
          </h2>
          <ScanForm />
        </div>
      </div>
    </section>
  );
}
