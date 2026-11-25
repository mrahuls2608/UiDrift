import { Hero } from '@/features/landing/Hero';
import { Benefits } from '@/features/landing/Benefits';
import { Gallery } from '@/features/landing/Gallery';
import { RollingSteps } from '@/features/landing/RollingSteps';
import { DemoVideo, FinalCta, Privacy } from '@/features/landing/Sections';
import { Reveal } from '@/components/motion/Reveal';
import { ScrollProgress } from '@/components/motion/ScrollProgress';

export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <div className="mx-auto flex max-w-content flex-col gap-8 px-4 pb-16 pt-6">
        <Hero />
        <Reveal variant="up">
          <Benefits />
        </Reveal>
        <Reveal variant="up">
          <Gallery />
        </Reveal>
        <Reveal variant="tilt">
          <DemoVideo />
        </Reveal>
        <RollingSteps />
        <Reveal variant="up">
          <Privacy />
        </Reveal>
        <Reveal variant="zoom">
          <FinalCta />
        </Reveal>
      </div>
    </>
  );
}
