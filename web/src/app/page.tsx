import { Hero } from '@/features/landing/Hero';
import { Benefits } from '@/features/landing/Benefits';
import { Gallery } from '@/features/landing/Gallery';
import { DemoVideo, FinalCta, HowItWorks, Privacy } from '@/features/landing/Sections';

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-content flex-col gap-8 px-4 pb-16 pt-6">
      <Hero />
      <Benefits />
      <Gallery />
      <DemoVideo />
      <HowItWorks />
      <Privacy />
      <FinalCta />
    </div>
  );
}
