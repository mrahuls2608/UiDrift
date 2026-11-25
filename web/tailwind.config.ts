import type { Config } from 'tailwindcss';

/** Every value maps to a design token from docs/DESIGN.md — the scales are replaced, not extended. */
/** Token colors that also support Tailwind opacity modifiers (e.g. bg-success/10) via color-mix. */
const token = (name: string) =>
  `color-mix(in srgb, var(--color-${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      /** Fixed white for text and controls on brand gradients and art panels (same in both themes). */
      white: '#ffffff',
      bg: token('bg'),
      surface: token('surface'),
      'surface-2': token('surface-2'),
      border: token('border'),
      text: token('text'),
      muted: token('text-muted'),
      primary: token('primary'),
      'on-primary': token('on-primary'),
      accent: token('accent'),
      success: token('success'),
      warning: token('warning'),
      danger: token('danger'),
      mint: token('mint'),
      'mint-ink': token('mint-ink'),
      blush: token('blush'),
      'blush-ink': token('blush-ink'),
      ink: token('ink'),
    },
    spacing: {
      0: '0',
      px: '1px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      6: '24px',
      8: '32px',
      11: '44px',
      12: '48px',
      16: '64px',
      24: '96px',
    },
    fontSize: {
      xs: ['12px', { lineHeight: '1.5' }],
      sm: ['14px', { lineHeight: '1.5' }],
      base: ['16px', { lineHeight: '1.5' }],
      lg: ['20px', { lineHeight: '1.2' }],
      xl: ['24px', { lineHeight: '1.2' }],
      '2xl': ['32px', { lineHeight: '1.2' }],
      '3xl': ['48px', { lineHeight: '1.1' }],
      '4xl': ['64px', { lineHeight: '1.05' }],
    },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    fontFamily: {
      sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      full: 'var(--radius-full)',
    },
    boxShadow: {
      none: 'none',
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
    },
    extend: {
      maxWidth: { content: '1200px', prose: '640px', form: '400px' },
      transitionDuration: { DEFAULT: '150ms', 200: '200ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)' },
    },
  },
  plugins: [],
};

export default config;
