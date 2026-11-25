export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none">
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        fill="var(--color-surface-2)"
        stroke="var(--color-border)"
      />
      <rect x="5" y="6" width="9" height="3" rx="1.5" fill="var(--color-primary)" />
      <rect
        x="5"
        y="10.5"
        width="14"
        height="3"
        rx="1.5"
        fill="var(--color-primary)"
        opacity="0.6"
      />
      <rect
        x="7"
        y="15"
        width="8"
        height="3"
        rx="1.5"
        fill="var(--color-warning)"
        transform="rotate(-6 11 16.5)"
      />
    </svg>
  );
}
