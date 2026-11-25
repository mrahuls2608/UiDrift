'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';

export type RevealVariant = 'up' | 'pop' | 'zoom' | 'left' | 'right' | 'tilt';

export interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  /** Delay in ms (use with lists for a stagger). */
  delay?: number;
  as?: ElementType;
  className?: string;
  /** Portion of the element that must be visible before it animates (0–1). */
  threshold?: number;
}

/**
 * Animates its children in once they scroll into view. Uses one IntersectionObserver per element,
 * animates only transform/opacity, and shows content immediately without JS or with reduced motion.
 */
export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  as: Tag = 'div',
  className,
  threshold = 0.18,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      data-inview={inView}
      className={className}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
