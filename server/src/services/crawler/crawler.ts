import type { Browser, HTTPRequest, Page } from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { SCAN_LIMITS, type PageResult, type RawA11yIssue, type RawElement } from '@uidrift/shared';
import { EXTRACT_SCRIPT } from './extract-script.js';
import { USER_AGENT, fetchRobots, type RobotsRules } from './robots.js';
import { createHostGuard } from './url-guard.js';
import { launchBrowser } from './browser.js';
import { logger } from '../../lib/logger.js';

export interface CrawlHooks {
  onPageStarted?: (url: string, index: number, total: number) => void | Promise<void>;
  onPageDone?: (url: string, index: number, total: number) => void | Promise<void>;
  isCancelled?: () => boolean | Promise<boolean>;
}

export interface CrawlOptions extends CrawlHooks {
  startUrl: string;
  maxPages: number;
  allowPrivate?: boolean;
  pageTimeoutMs?: number;
  scanTimeoutMs?: number;
  browserFactory?: () => Promise<Browser>;
}

export class CrawlCancelledError extends Error {
  constructor() {
    super('Scan cancelled');
  }
}

const SKIP_EXT =
  /\.(pdf|zip|gz|rar|7z|jpe?g|png|gif|webp|svg|ico|mp4|mp3|webm|avi|mov|dmg|exe|css|js|json|xml|txt|woff2?)$/i;
const BLOCKED_TYPES = new Set(['image', 'media', 'font']);

function sameSite(a: URL, b: URL): boolean {
  const strip = (h: string) => h.replace(/^www\./, '');
  return strip(a.hostname) === strip(b.hostname);
}

/** Canonical form used for de-duplicating crawl targets. */
export function normalizePageUrl(raw: string, base?: string): string | null {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.href;
  } catch {
    return null;
  }
}

export function pickLinks(links: string[], start: URL, robots: RobotsRules): string[] {
  const out = new Set<string>();
  for (const link of links) {
    const normalized = normalizePageUrl(link, start.href);
    if (!normalized) continue;
    const url = new URL(normalized);
    if (!sameSite(url, start) || SKIP_EXT.test(url.pathname)) continue;
    if (!robots.isAllowed(url.pathname)) continue;
    out.add(normalized);
  }
  return [...out];
}

async function setupPage(page: Page, guard: (url: string) => Promise<boolean>): Promise<void> {
  await page.setUserAgent(USER_AGENT);
  await page.setViewport({ width: 1366, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', (req: HTTPRequest) => {
    if (req.isInterceptResolutionHandled()) return;
    if (BLOCKED_TYPES.has(req.resourceType())) {
      void req.abort('blockedbyclient');
      return;
    }
    void guard(req.url()).then((ok) => {
      if (req.isInterceptResolutionHandled()) return;
      if (ok) void req.continue();
      else void req.abort('blockedbyclient');
    });
  });
}

async function runAxe(page: Page, pageUrl: string): Promise<RawA11yIssue[]> {
  try {
    const results = await new AxePuppeteer(page).withTags(['wcag2a', 'wcag2aa']).analyze();
    const issues: RawA11yIssue[] = [];
    for (const v of results.violations) {
      const impact = (v.impact ?? 'minor') as RawA11yIssue['impact'];
      for (const node of v.nodes.slice(0, 3)) {
        issues.push({
          id: v.id,
          impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          selector: node.target.join(' ').slice(0, 200),
          page: pageUrl,
        });
      }
    }
    const severe = issues.filter((i) => i.impact === 'serious' || i.impact === 'critical');
    const moderate = issues.filter((i) => i.impact === 'moderate').slice(0, 5);
    return [...severe, ...moderate];
  } catch (err) {
    logger.warn({ err: (err as Error).message, pageUrl }, 'axe failed');
    return [];
  }
}

interface ExtractResult {
  elements: Omit<RawElement, 'page'>[];
  links: string[];
}

async function scanPage(
  browser: Browser,
  url: string,
  guard: (url: string) => Promise<boolean>,
  timeoutMs: number,
): Promise<{ result: PageResult; links: string[]; finalUrl: string }> {
  const page = await browser.newPage();
  try {
    await setupPage(page, guard);
    page.setDefaultTimeout(timeoutMs);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 4000 }).catch(() => undefined);
    const finalUrl = page.url();
    const extracted = (await page.evaluate(
      `${EXTRACT_SCRIPT}(${SCAN_LIMITS.MAX_ELEMENTS_PER_PAGE})`,
    )) as ExtractResult;
    const a11y = await runAxe(page, finalUrl);
    const elements = extracted.elements.map((e) => ({ ...e, page: finalUrl }));
    return { result: { url: finalUrl, elements, a11y }, links: extracted.links, finalUrl };
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** Same-domain BFS crawl. Pages that fail are skipped; the browser is always closed. */
export async function crawlSite(opts: CrawlOptions): Promise<PageResult[]> {
  const start = new URL(opts.startUrl);
  const pageTimeout = opts.pageTimeoutMs ?? SCAN_LIMITS.PAGE_TIMEOUT_MS;
  const deadline = Date.now() + (opts.scanTimeoutMs ?? SCAN_LIMITS.SCAN_TIMEOUT_MS);
  const guard = createHostGuard({ allowPrivate: opts.allowPrivate });
  const robots = await fetchRobots(start.origin);
  if (!robots.isAllowed(start.pathname)) {
    throw new Error('robots.txt does not allow UIDriftBot to scan this page.');
  }

  const startKey = normalizePageUrl(start.href) ?? start.href;
  const queue: string[] = [startKey];
  const visited = new Set<string>([startKey]);
  const results: PageResult[] = [];
  const browser = await (opts.browserFactory ?? launchBrowser)();

  try {
    while (queue.length && results.length < opts.maxPages) {
      if (await opts.isCancelled?.()) throw new CrawlCancelledError();
      if (Date.now() + 3000 > deadline) break;
      const url = queue.shift() as string;
      const total = Math.min(opts.maxPages, results.length + queue.length + 1);
      await opts.onPageStarted?.(url, results.length + 1, total);
      try {
        const timeout = Math.max(3000, Math.min(pageTimeout, deadline - Date.now()));
        const { result, links, finalUrl } = await scanPage(browser, url, guard, timeout);
        if (results.length > 0 && !sameSite(new URL(finalUrl), start)) continue;
        results.push(result);
        visited.add(normalizePageUrl(finalUrl) ?? finalUrl);
        for (const link of pickLinks(links, start, robots)) {
          if (!visited.has(link)) {
            visited.add(link);
            queue.push(link);
          }
        }
        await opts.onPageDone?.(
          result.url,
          results.length,
          Math.min(opts.maxPages, results.length + queue.length),
        );
      } catch (err) {
        if (err instanceof CrawlCancelledError) throw err;
        logger.warn({ err: (err as Error).message, url }, 'page skipped');
        if (results.length === 0 && queue.length === 0) throw err;
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
  return results;
}
