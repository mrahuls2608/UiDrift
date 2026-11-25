import { describe, expect, it } from 'vitest';
import { toPreviewStyle } from '@/components/ui/preview-styles';

describe('toPreviewStyle', () => {
  it('keeps valid values', () => {
    expect(
      toPreviewStyle({
        bg: '#fff',
        color: '#000000',
        fontSize: '14px',
        fontWeight: '600',
        border: '1px solid #e5e7eb',
        fontFamily: 'inter',
        textTransform: 'uppercase',
      }),
    ).toMatchObject({
      backgroundColor: '#fff',
      color: '#000000',
      fontSize: '14px',
      fontWeight: 600,
      border: '1px solid #e5e7eb',
      fontFamily: '"inter", sans-serif',
      textTransform: 'uppercase',
    });
  });

  it('drops anything that could inject CSS', () => {
    const s = toPreviewStyle({
      bg: 'url(https://evil.test/x.png)',
      color: 'red;background:url(x)',
      fontSize: '14px;position:fixed',
      shadow: 'url(javascript:alert(1)) 0 0',
      border: '1px solid red; display:none',
      fontFamily: 'x";}body{display:none',
      textTransform: 'expression(alert(1))',
    });
    expect(s.backgroundColor).toBeUndefined();
    expect(s.color).toBeUndefined();
    expect(s.fontSize).toBeUndefined();
    expect(s.boxShadow).toBeUndefined();
    expect(s.border).toBe('none');
    expect(s.fontFamily).toBeUndefined();
    expect(s.textTransform).toBeUndefined();
  });
});
