import type { ComponentType, PageResult, RawElement } from '@uidrift/shared';

const BASE: Record<string, string> = {
  color: 'rgb(255, 255, 255)',
  backgroundColor: 'rgb(79, 70, 229)',
  fontFamily: '"Inter", sans-serif',
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '20px',
  paddingTop: '8px',
  paddingRight: '16px',
  paddingBottom: '8px',
  paddingLeft: '16px',
  marginTop: '0px',
  marginRight: '0px',
  marginBottom: '0px',
  marginLeft: '0px',
  borderTopWidth: '0px',
  borderTopStyle: 'none',
  borderTopColor: 'rgb(0, 0, 0)',
  borderTopLeftRadius: '6px',
  boxShadow: 'none',
  textDecorationLine: 'none',
  textTransform: 'none',
};

export function el(
  type: ComponentType,
  styles: Record<string, string> = {},
  page = 'https://a.test/',
  text = 'Click',
): RawElement {
  return {
    type,
    tag: type === 'heading' ? 'h2' : type,
    text,
    page,
    styles: { ...BASE, ...styles },
  };
}

export function page(
  url: string,
  elements: RawElement[],
  a11y: PageResult['a11y'] = [],
): PageResult {
  return { url, elements: elements.map((e) => ({ ...e, page: url })), a11y };
}
