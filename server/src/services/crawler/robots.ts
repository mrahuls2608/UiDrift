export const USER_AGENT = 'UIDriftBot/1.0 (+https://github.com/mrahuls2608/UiDrift)';
const BOT_TOKEN = 'uidriftbot';

interface Rule {
  allow: boolean;
  path: string;
}

export interface RobotsRules {
  isAllowed(pathname: string): boolean;
}

function toRegex(path: string): RegExp {
  const anchored = path.endsWith('$');
  const body = (anchored ? path.slice(0, -1) : path)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

/** Minimal robots.txt parser: picks the UIDriftBot group, else `*`; longest matching rule wins. */
export function parseRobots(text: string): RobotsRules {
  const groups = new Map<string, Rule[]>();
  let agents: string[] = [];
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) agents = [];
      agents.push(value.toLowerCase());
      for (const a of agents) if (!groups.has(a)) groups.set(a, []);
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if ((key === 'allow' || key === 'disallow') && agents.length) {
      if (key === 'disallow' && value === '') continue;
      for (const a of agents) groups.get(a)?.push({ allow: key === 'allow', path: value });
    }
  }

  const rules = groups.get(BOT_TOKEN) ?? groups.get('*') ?? [];
  return {
    isAllowed(pathname: string) {
      let best: Rule | undefined;
      for (const rule of rules) {
        if (!toRegex(rule.path).test(pathname)) continue;
        if (
          !best ||
          rule.path.length > best.path.length ||
          (rule.path.length === best.path.length && rule.allow)
        ) {
          best = rule;
        }
      }
      return best ? best.allow : true;
    },
  };
}

const ALLOW_ALL: RobotsRules = { isAllowed: () => true };

/** Fetch robots.txt for an origin. Missing or unreachable robots.txt means "allowed". */
export async function fetchRobots(origin: string, timeoutMs = 5000): Promise<RobotsRules> {
  try {
    const res = await fetch(new URL('/robots.txt', origin), {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (res.status === 401 || res.status === 403) return { isAllowed: () => false };
    if (!res.ok) return ALLOW_ALL;
    const text = (await res.text()).slice(0, 500_000);
    return parseRobots(text);
  } catch {
    return ALLOW_ALL;
  }
}
