import { ScanForm } from '@/features/scan/ScanForm';
import { DemoChips } from '@/features/scan/DemoChips';
import { HowItWorks } from '@/features/scan/HowItWorks';
import { SamplePreview } from '@/features/scan/SamplePreview';
import { ServerWake } from '@/features/scan/ServerWake';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return (
    <>
      <section className="mx-auto flex max-w-content flex-col items-start gap-6 px-4 py-16 sm:py-24">
        <ServerWake />
        <h1 className="max-w-prose text-2xl font-bold sm:text-3xl">
          Find the UI drift hiding in your website
        </h1>
        <p className="max-w-prose text-base text-muted sm:text-lg">
          UIDrift crawls your site, groups near-duplicate buttons, colors and spacing, scores
          consistency from 0 to 100, and generates design tokens and React components to fix it.
        </p>
        <ScanForm initialUrl={typeof url === 'string' ? url.slice(0, 2048) : ''} />
        <DemoChips />
      </section>
      <HowItWorks />
      <SamplePreview />
    </>
  );
}
