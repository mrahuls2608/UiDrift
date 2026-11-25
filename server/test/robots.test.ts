import { describe, expect, it } from 'vitest';
import { parseRobots } from '../src/services/crawler/robots.js';

describe('parseRobots', () => {
  it('uses the * group by default', () => {
    const r = parseRobots('User-agent: *\nDisallow: /admin\nDisallow: /tmp/');
    expect(r.isAllowed('/')).toBe(true);
    expect(r.isAllowed('/admin/users')).toBe(false);
    expect(r.isAllowed('/tmp/x')).toBe(false);
  });

  it('prefers a UIDriftBot group over *', () => {
    const r = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: UIDriftBot\nDisallow: /private',
    );
    expect(r.isAllowed('/about')).toBe(true);
    expect(r.isAllowed('/private')).toBe(false);
  });

  it('applies the longest match and allows on ties', () => {
    const r = parseRobots(
      'User-agent: *\nDisallow: /docs\nAllow: /docs/public\nDisallow: /x\nAllow: /x',
    );
    expect(r.isAllowed('/docs/secret')).toBe(false);
    expect(r.isAllowed('/docs/public/page')).toBe(true);
    expect(r.isAllowed('/x')).toBe(true);
  });

  it('supports wildcards, $ anchors, comments and empty disallow', () => {
    const r = parseRobots('# c\nUser-agent: *\nDisallow: /*.pdf$\nDisallow:\n');
    expect(r.isAllowed('/file.pdf')).toBe(false);
    expect(r.isAllowed('/file.pdf?x=1')).toBe(true);
    expect(r.isAllowed('/anything')).toBe(true);
  });

  it('handles agents sharing a group', () => {
    const r = parseRobots('User-agent: googlebot\nUser-agent: uidriftbot\nDisallow: /shared');
    expect(r.isAllowed('/shared')).toBe(false);
  });
});
