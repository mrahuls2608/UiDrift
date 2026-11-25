'use client';

import { useEffect, useRef } from 'react';

/** Thin brand-gradient bar at the top of the page showing how far the visitor has scrolled. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.current?.style.setProperty('--progress', String(max > 0 ? window.scrollY / max : 0));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div
      ref={bar}
      aria-hidden
      className="scroll-progress fixed inset-x-0 top-0 z-50 h-1 bg-brand"
    />
  );
}
