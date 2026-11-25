import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import { crawlSite, normalizePageUrl, pickLinks } from '../src/services/crawler/crawler.js';
import { parseRobots } from '../src/services/crawler/robots.js';
import { analyzePages } from '../src/services/analysis/index.js';

const chrome = process.env.CHROME_PATH;

const PAGES: Record<string, string> = {
  '/': `<!doctype html><html lang="en"><head><title>Home</title><style>
    .btn{background:#4f46e5;color:#fff;padding:8px 16px;border:0;border-radius:6px;font:600 14px sans-serif}
    .btn2{background:#5047e6;color:#fff;padding:9px 16px;border:0;border-radius:6px;font:600 14px sans-serif}
    .ghost{background:#fff;color:#4f46e5;padding:8px 16px;border:1px solid #4f46e5;border-radius:999px}
    .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;width:300px;height:120px}
    h1{font-size:32px} h2{font-size:24px}
    </style></head><body><main>
    <h1>Hello</h1><h2>Sub</h2>
    <button class="btn">Buy</button><button class="btn2">Go</button><button class="ghost">More</button>
    <input placeholder="Email" style="padding:8px;border:1px solid #ccc">
    <div class="card"><p>Card body</p></div>
    <a href="/about">About</a><a href="/secret">Secret</a><a href="https://other.test/">Out</a>
    <img src="/x.png">
    </main></body></html>`,
  '/about': `<!doctype html><html lang="en"><head><title>About</title></head><body><main>
    <h1 style="font-size:30px">About</h1><button style="background:#dc2626;color:#fff">Delete</button>
    <a href="/">Home</a></main></body></html>`,
  '/secret': '<html><body><button>Hidden</button></body></html>',
  '/robots.txt': 'User-agent: *\nDisallow: /secret',
};

let server: Server;
let base: string;
const served: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    served.push(req.url ?? '');
    const body = PAGES[req.url ?? ''];
    if (!body) return res.writeHead(404).end();
    res
      .writeHead(200, { 'Content-Type': req.url === '/robots.txt' ? 'text/plain' : 'text/html' })
      .end(body);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('link helpers', () => {
  it('normalizes and filters links', () => {
    expect(normalizePageUrl('/a/?utm_source=x#top', 'https://s.test')).toBe('https://s.test/a');
    const robots = parseRobots('User-agent: *\nDisallow: /no');
    const links = pickLinks(
      [
        'https://s.test/a',
        'https://www.s.test/b',
        'https://o.test/',
        '/file.pdf',
        '/no/x',
        'mailto:x@y.z',
        '/a#h',
      ],
      new URL('https://s.test/'),
      robots,
    );
    expect(links).toEqual(['https://s.test/a', 'https://www.s.test/b']);
  });
});

describe.skipIf(!chrome)('crawlSite (real Chromium)', () => {
  it('crawls same-site pages, respects robots.txt, blocks images and extracts styles', async () => {
    const started: string[] = [];
    const pages = await crawlSite({
      startUrl: `${base}/`,
      maxPages: 5,
      allowPrivate: true,
      onPageStarted: (u) => void started.push(u),
      browserFactory: () =>
        puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] }),
    });
    expect(pages.map((p) => new URL(p.url).pathname)).toEqual(['/', '/about']);
    expect(served).not.toContain('/secret');
    expect(served).not.toContain('/x.png');
    const home = pages[0]!;
    const types = new Set(home.elements.map((e) => e.type));
    expect([...types].sort()).toEqual(['button', 'card', 'heading', 'input', 'link']);
    expect(home.elements.find((e) => e.text === 'Buy')?.styles.backgroundColor).toBe(
      'rgb(79, 70, 229)',
    );

    const report = analyzePages(pages);
    const buttons = report.componentGroups.filter((g) => g.type === 'button');
    // .btn and .btn2 are near-duplicates (1px padding, ΔE < 3) and merge
    expect(buttons).toHaveLength(3);
    expect(buttons[0]?.count).toBe(2);
  }, 60_000);
});
