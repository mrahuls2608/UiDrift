import { ScoreRing } from '@/components/ui/ScoreRing';

/** Decorative “report” window: drifted buttons collapse into three standards. Pure CSS motion. */
const DRIFTED = [
  { bg: 'var(--color-primary)', fg: 'var(--color-on-primary)', r: 6, dx: -18, dy: 10, rot: -4 },
  { bg: 'var(--color-accent)', fg: 'var(--color-bg)', r: 12, dx: 14, dy: -8, rot: 3 },
  { bg: 'transparent', fg: 'var(--color-text)', r: 999, dx: -10, dy: -14, rot: 5 },
];

const GHOSTS = [
  { r: 2, dx: 30, dy: 26, rot: -8 },
  { r: 8, dx: -34, dy: 20, rot: 6 },
  { r: 4, dx: 22, dy: -30, rot: -5 },
  { r: 16, dx: -26, dy: -24, rot: 9 },
];

const SWATCHES = [
  '#22c55e',
  '#21c25c',
  '#818cf8',
  '#7f8af6',
  '#f87171',
  '#94a3b8',
  '#93a2b7',
  '#f1f5f9',
];

export function HeroMockup() {
  return (
    <div aria-hidden className="relative">
      <div className="absolute -inset-6 rounded-lg bg-primary/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-lg border border-border bg-surface shadow-md">
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-danger/70" />
          <span className="h-3 w-3 rounded-full bg-warning/70" />
          <span className="h-3 w-3 rounded-full bg-success/70" />
          <span className="ml-3 truncate font-mono text-xs text-muted">
            uidrift.app/report/acme.example
          </span>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex justify-center">
            <ScoreRing value={62} size={132} />
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-muted">Buttons</p>
              <p className="font-mono text-lg font-semibold">
                14 variants <span className="text-muted">→</span>{' '}
                <span className="text-primary">3</span>
              </p>
            </div>
            <div className="relative flex min-h-12 flex-wrap items-center gap-2">
              {GHOSTS.map((g, i) => (
                <span
                  key={`g${i}`}
                  className="absolute left-1/3 top-1 h-8 w-16 border border-muted/50 bg-surface-2"
                  style={
                    {
                      borderRadius: g.r,
                      '--dx': `${g.dx}px`,
                      '--dy': `${g.dy}px`,
                      '--r': `${g.rot}deg`,
                      '--end': 0,
                      animation: 'collapse 3.2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite alternate',
                      animationDelay: `${i * 80}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
              {DRIFTED.map((b, i) => (
                <span
                  key={`b${i}`}
                  className="relative inline-flex h-8 items-center border px-3 text-xs font-semibold"
                  style={
                    {
                      background: b.bg,
                      color: b.fg,
                      borderColor: b.bg === 'transparent' ? 'var(--color-border)' : b.bg,
                      borderRadius: b.r,
                      '--dx': `${b.dx}px`,
                      '--dy': `${b.dy}px`,
                      '--r': `${b.rot}deg`,
                      animation: 'collapse 3.2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite alternate',
                    } as React.CSSProperties
                  }
                >
                  {['Primary', 'Secondary', 'Ghost'][i]}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-border p-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
              Colors · ΔE &lt; 3 merged
            </p>
            <div className="flex -space-x-1">
              {SWATCHES.map((c, i) => (
                <span
                  key={c}
                  className="reveal h-6 w-6 rounded-full border-2 border-surface"
                  style={{ background: c, '--i': i } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">Export</p>
            <p className="font-mono text-xs text-primary">tokens.css ✓</p>
            <p className="font-mono text-xs text-primary">Button.tsx ✓</p>
          </div>
        </div>
      </div>
    </div>
  );
}
