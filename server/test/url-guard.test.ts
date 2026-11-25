import { describe, expect, it } from 'vitest';
import {
  assertPublicUrl,
  createHostGuard,
  isPrivateIp,
  parsePublicUrl,
} from '../src/services/crawler/url-guard.js';

const resolveTo =
  (...ips: string[]) =>
  async () =>
    ips;

describe('isPrivateIp', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '224.0.0.1',
    '::1',
    '::',
    'fc00::1',
    'fd12::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    'not-an-ip',
  ])('blocks %s', (ip) => expect(isPrivateIp(ip)).toBe(true));

  it.each(['8.8.8.8', '172.32.0.1', '93.184.216.34', '2606:4700::6810:84e5'])('allows %s', (ip) =>
    expect(isPrivateIp(ip)).toBe(false),
  );
});

describe('parsePublicUrl', () => {
  it.each([
    'file:///etc/passwd',
    'ftp://example.com',
    'javascript:alert(1)',
    'http://localhost:4000',
    'http://foo.localhost',
    'http://127.0.0.1',
    'http://[::1]/',
    'http://169.254.169.254/latest',
    'http://user:pass@example.com',
    'http://example.com:22',
    'http://intranet',
    'http://printer.local',
  ])('rejects %s', (url) => expect(() => parsePublicUrl(url)).toThrow(/allowed|valid/i));

  it('accepts public URLs and strips the hash', () => {
    expect(parsePublicUrl('https://example.com/a#b').href).toBe('https://example.com/a');
  });
});

describe('assertPublicUrl', () => {
  it('rejects domains that resolve to private IPs (DNS re-check)', async () => {
    await expect(
      assertPublicUrl('https://evil.test', { resolve: resolveTo('10.0.0.5') }),
    ).rejects.toMatchObject({
      code: 'INVALID_URL',
    });
  });

  it('rejects when any resolved address is private', async () => {
    await expect(
      assertPublicUrl('https://mixed.test', { resolve: resolveTo('8.8.8.8', '127.0.0.1') }),
    ).rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('rejects unresolvable domains', async () => {
    const resolve = async () => {
      throw new Error('ENOTFOUND');
    };
    await expect(assertPublicUrl('https://nope.test', { resolve })).rejects.toThrow(
      /could not be found/,
    );
  });

  it('accepts public domains', async () => {
    const url = await assertPublicUrl('https://ok.test/page', {
      resolve: resolveTo('93.184.216.34'),
    });
    expect(url.hostname).toBe('ok.test');
  });
});

describe('createHostGuard', () => {
  it('caches per host and blocks private hosts', async () => {
    let calls = 0;
    const guard = createHostGuard({
      resolve: async (h) => {
        calls++;
        return h === 'internal.test' ? ['192.168.0.2'] : ['93.184.216.34'];
      },
    });
    expect(await guard('https://ok.test/a')).toBe(true);
    expect(await guard('https://ok.test/b')).toBe(true);
    expect(await guard('https://internal.test/')).toBe(false);
    expect(await guard('data:image/png;base64,xx')).toBe(true);
    expect(calls).toBe(2);
  });
});
