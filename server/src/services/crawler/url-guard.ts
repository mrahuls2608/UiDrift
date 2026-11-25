import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { AppError } from '../../lib/errors.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
]);
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa'];

export const invalidUrl = (message = 'Only public http/https URLs are allowed.') =>
  new AppError(400, 'INVALID_URL', message);

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const IPV4_BLOCKS: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return IPV4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::' || lower === '::1') return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);
  if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(lower)) return true; // hex-form mapped v4
  const first = parseInt(lower.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (lower.startsWith('64:ff9b:') || lower.startsWith('2001:db8:')) return true;
  return false;
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved and documentation ranges. */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip.replace(/^\[|\]$/g, ''));
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return BLOCKED_HOSTNAMES.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s));
}

/** Synchronous checks: protocol, credentials, port, hostname and literal IPs. */
export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalidUrl('Enter a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw invalidUrl();
  if (url.username || url.password) throw invalidUrl('URLs with credentials are not allowed.');
  if (url.port && !['80', '443', '8080', '8443'].includes(url.port)) {
    throw invalidUrl('Only standard web ports are allowed.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isBlockedHostname(host)) throw invalidUrl();
  if (isIP(host) && isPrivateIp(host)) throw invalidUrl();
  if (!isIP(host) && !host.includes('.')) throw invalidUrl();
  url.hash = '';
  return url;
}

export type Resolver = (hostname: string) => Promise<string[]>;

const defaultResolver: Resolver = async (hostname) =>
  (await lookup(hostname, { all: true, verbatim: true })).map((r) => r.address);

/** Full SSRF guard: synchronous checks, then DNS resolution with every address re-checked. */
export async function assertPublicUrl(
  raw: string,
  opts: { allowPrivate?: boolean; resolve?: Resolver } = {},
): Promise<URL> {
  if (opts.allowPrivate) return new URL(raw);
  const url = parsePublicUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return url;
  let addresses: string[];
  try {
    addresses = await (opts.resolve ?? defaultResolver)(host);
  } catch {
    throw invalidUrl('That domain could not be found.');
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) throw invalidUrl();
  return url;
}

/** Cached host check used for every request the headless browser makes (DNS-rebinding guard). */
export function createHostGuard(opts: { allowPrivate?: boolean; resolve?: Resolver } = {}) {
  const cache = new Map<string, Promise<boolean>>();
  return (rawUrl: string): Promise<boolean> => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return Promise.resolve(false);
    }
    if (url.protocol === 'data:' || url.protocol === 'blob:') return Promise.resolve(true);
    const key = `${url.protocol}//${url.host}`;
    let result = cache.get(key);
    if (!result) {
      result = assertPublicUrl(url.href, opts).then(
        () => true,
        () => false,
      );
      cache.set(key, result);
    }
    return result;
  };
}
