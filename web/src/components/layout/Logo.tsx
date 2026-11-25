export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden fill="none">
      <defs>
        <linearGradient
          id="uidrift-logo"
          x1="0"
          y1="0"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c2185b" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="9" fill="url(#uidrift-logo)" />
      <rect x="7" y="8" width="10" height="3" rx="1.5" fill="#fff" />
      <rect x="7" y="12.5" width="14" height="3" rx="1.5" fill="#fff" opacity="0.75" />
      <rect
        x="9"
        y="17"
        width="8"
        height="3"
        rx="1.5"
        fill="#fff"
        opacity="0.55"
        transform="rotate(-8 13 18.5)"
      />
    </svg>
  );
}
