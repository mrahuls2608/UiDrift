import type { Config } from 'tailwindcss';

/** Every value maps to a design token from docs/DESIGN.md — the scales are replaced, not extended. */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--color-bg)',
      surface: 'var(--color-surface)',
      border: 'var(--color-border)',
      text: 'var(--color-text)',
      muted: 'var(--color-text-muted)',
      primary: 'var(--color-primary)',
      'on-primary': 'var(--color-on-primary)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      danger: 'var(--color-danger)',
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
      12: '48px',
      16: '64px',
    },
    fontSize: {
      xs: ['12px', { lineHeight: '1.5' }],
      sm: ['14px', { lineHeight: '1.5' }],
      base: ['16px', { lineHeight: '1.5' }],
      lg: ['20px', { lineHeight: '1.2' }],
      xl: ['24px', { lineHeight: '1.2' }],
      '2xl': ['32px', { lineHeight: '1.2' }],
      '3xl': ['48px', { lineHeight: '1.2' }],
    },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    fontFamily: {
      sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      full: 'var(--radius-full)',
    },
    boxShadow: { none: 'none', sm: 'var(--shadow-sm)', md: 'var(--shadow-md)' },
    extend: {
      maxWidth: { content: '1200px', prose: '640px', form: '400px' },
      transitionDuration: { DEFAULT: '150ms', 200: '200ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)' },
    },
  },
  plugins: [],
};

export default config;
