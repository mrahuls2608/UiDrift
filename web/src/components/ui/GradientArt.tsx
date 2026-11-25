import { cn } from '@/lib/cn';

/** Decorative pastel art panel: soft gradient, flowing waves, dotted grid and a glass orb. */
const PALETTES = {
  aurora: ['#ffd1dc', '#f6b8e8', '#c7b8ff', '#9ec5ff'],
  blush: ['#ffe0e9', '#ffc4d6', '#f3b4f0', '#e4c7ff'],
  lagoon: ['#d4f5ef', '#a7e8e0', '#a5c8ff', '#c3b5fd'],
  iris: ['#dde3ff', '#b9c2ff', '#9aa8ff', '#c4a5ff'],
} as const;

export type ArtPalette = keyof typeof PALETTES;

export interface GradientArtProps {
  palette?: ArtPalette;
  className?: string;
  orb?: boolean;
  dots?: boolean;
}

export function GradientArt({
  palette = 'aurora',
  className,
  orb = true,
  dots = true,
}: GradientArtProps) {
  const [a, b, c, d] = PALETTES[palette];
  const id = `art-${palette}`;
  return (
    <div
      aria-hidden
      className={cn('relative overflow-hidden', className)}
      style={{ background: `linear-gradient(150deg, ${a} 0%, ${b} 35%, ${c} 70%, ${d} 100%)` }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`${id}-w1`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id={`${id}-w2`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={d} stopOpacity="0.9" />
            <stop offset="1" stopColor={c} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M0 210 C 90 150, 170 300, 260 240 S 380 120, 400 160 L400 500 L0 500 Z"
          fill={`url(#${id}-w2)`}
        />
        <path
          d="M0 120 C 120 60, 180 260, 290 200 S 380 60, 400 90 L400 0 L0 0 Z"
          fill={`url(#${id}-w1)`}
        />
        <path
          d="M-20 330 C 100 260, 200 420, 300 340 S 420 260, 420 300"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <path
          d="M-20 360 C 110 300, 210 450, 310 370 S 420 290, 420 330"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
      </svg>
      {dots && <div className="bg-dots absolute right-6 top-6 h-24 w-24 text-white/70" />}
      {orb && (
        <div
          className="float absolute bottom-[22%] right-[22%] h-16 w-16 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, #ffffff, rgba(255,255,255,0.35) 55%, rgba(255,255,255,0.1))',
            boxShadow:
              '0 12px 30px rgba(80, 60, 200, 0.25), inset 0 -6px 16px rgba(120, 100, 255, 0.25)',
          }}
        />
      )}
    </div>
  );
}
