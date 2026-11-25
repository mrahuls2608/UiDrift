import { Hero } from '@/features/landing/Hero';
import { Features } from '@/features/landing/Features';
import { Pipeline } from '@/features/landing/Pipeline';
import { FinalCta } from '@/features/landing/FinalCta';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return (
    <>
      <Hero initialUrl={typeof url === 'string' ? url.slice(0, 2048) : ''} />
      <Features />
      <Pipeline />
      <FinalCta />
    </>
  );
}
