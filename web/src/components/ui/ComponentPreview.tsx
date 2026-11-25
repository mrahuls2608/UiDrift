import type { ComponentType } from '@uidrift/shared';
import { toPreviewStyle } from './preview-styles';

export interface ComponentPreviewProps {
  type: ComponentType;
  styles: Record<string, string>;
  text?: string;
}

const FALLBACK: Record<ComponentType, string> = {
  button: 'Button',
  input: 'Input',
  heading: 'Heading',
  link: 'Link',
  card: 'Card content',
};

/** Renders a captured component in an isolated, inert box using only safe inline styles. */
export function ComponentPreview({ type, styles, text }: ComponentPreviewProps) {
  const style = toPreviewStyle(styles);
  const label = (text || FALLBACK[type]).slice(0, 40);
  const box = 'inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap';
  let node;
  if (type === 'input')
    node = (
      <span className={box} style={{ ...style, minWidth: 160 }}>
        {label}
      </span>
    );
  else if (type === 'card')
    node = (
      <span className="block w-full" style={{ ...style, minHeight: 64 }}>
        {label}
      </span>
    );
  else
    node = (
      <span className={box} style={{ lineHeight: 1.2, ...style }}>
        {label}
      </span>
    );

  return (
    <div
      aria-hidden
      inert
      className="flex min-h-16 w-full items-center justify-center overflow-hidden rounded-sm border border-border p-4"
      style={{
        contain: 'content',
        isolation: 'isolate',
        background:
          'repeating-conic-gradient(var(--color-surface) 0 25%, var(--color-bg) 0 50%) 0 0 / 16px 16px',
      }}
    >
      {node}
    </div>
  );
}
