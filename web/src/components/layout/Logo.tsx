export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none">
      <rect x="2" y="2" width="9" height="9" rx="2" fill="var(--color-primary)" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="var(--color-primary)" opacity="0.6" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="var(--color-primary)" opacity="0.6" />
      <rect
        x="14"
        y="14"
        width="9"
        height="9"
        rx="4.5"
        fill="var(--color-warning)"
        transform="rotate(12 18.5 18.5)"
      />
    </svg>
  );
}
