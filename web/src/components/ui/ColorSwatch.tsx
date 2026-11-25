import { safeColor } from './preview-styles';

export interface ColorSwatchProps {
  hex: string;
  count: number;
  merged?: string[];
}

export function ColorSwatch({ hex, count, merged = [] }: ColorSwatchProps) {
  const color = safeColor(hex) ?? 'transparent';
  const extra = merged.filter((m) => m !== hex);
  return (
    <figure className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className="h-16 w-full border-b border-border"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <figcaption className="flex flex-col gap-1 p-3">
        <span className="font-mono text-sm font-semibold text-text">{hex}</span>
        <span className="text-xs text-muted">
          Used {count}×{extra.length > 0 && ` · merged ${extra.length} near-identical`}
        </span>
        {extra.length > 0 && (
          <span className="flex flex-wrap gap-1" aria-label={`Merged colors: ${extra.join(', ')}`}>
            {extra.slice(0, 8).map((m) => (
              <span
                key={m}
                title={m}
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: safeColor(m) }}
              />
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
