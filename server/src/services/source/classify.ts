import type { ComponentType } from '@uidrift/shared';

/** Pseudo-states describe other states (hover, focus, ...) — not separate component variants. */
export const STATE_SELECTOR =
  /:(hover|focus|focus-visible|focus-within|active|visited|disabled|checked|placeholder|before|after|first-child|last-child|nth-child|not)\b|::/;

function lastCompound(selector: string): string {
  const parts = selector.trim().split(/\s*[\s>+~]\s*/);
  return (parts[parts.length - 1] ?? '').toLowerCase();
}

/** Classify a CSS selector by its last compound: `.card .btn-primary` → button. */
export function classifySelector(selector: string): ComponentType | undefined {
  const s = lastCompound(selector).replace(/::?[\w-]+(\([^)]*\))?/g, '');
  if (!s) return undefined;
  if (/\[type=["']?(checkbox|radio|hidden|range|file|color)/.test(s)) return undefined;
  if (
    /^button\b|(^|[.#]|[-_])(btn|button)([-_][\w-]*)?$|\[type=["']?(submit|button|reset)/.test(s) &&
    !/(group|wrapper|bar|list|row)$/.test(s)
  )
    return 'button';
  if (
    /^(input|textarea|select)\b|(^|[.#]|[-_])(form-control|input|text-?field|textarea|select|field)([-_][\w-]*)?$/.test(
      s,
    )
  )
    return 'input';
  if (
    /^h[1-6]\b|(^|[.#]|[-_])(h[1-6]|heading|headline|title)([-_][\w-]*)?$/.test(s) &&
    !/sub-?title/.test(s)
  )
    return 'heading';
  if (/^a(\b|$)|(^|[.#]|[-_])link([-_][\w-]*)?$/.test(s)) return 'link';
  if (
    /(^|[.#]|[-_])(card|panel|tile|box)([-_][\w-]*)?$/.test(s) &&
    !/(header|body|footer|title|text|image|img|icon|list)$/.test(s)
  )
    return 'card';
  return undefined;
}

/** Classify a markup tag or React component name: `<IconButton>` → button, `<h2>` → heading. */
export function classifyTag(tag: string): ComponentType | undefined {
  const t = tag.split('.').pop() ?? tag;
  const lower = t.toLowerCase();
  if (lower === 'button' || /^[A-Z]\w*Button$/.test(t)) return 'button';
  if (
    ['input', 'textarea', 'select'].includes(lower) ||
    /^(Input|TextField|TextInput|TextArea|Textarea|Select)$/.test(t)
  )
    return 'input';
  if (/^h[1-6]$/.test(lower) || /^(Heading|Title|Headline)$/.test(t)) return 'heading';
  if (lower === 'a' || /^(Link|NavLink|Anchor)$/.test(t)) return 'link';
  if (/^[A-Z]\w*Card$|^(Card|Panel|Tile)$/.test(t)) return 'card';
  return undefined;
}
