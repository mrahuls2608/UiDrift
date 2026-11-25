/**
 * Demo-only stand-in for the UIDrift API, so the walkthrough video can be recorded without
 * MongoDB, Redis or network access. It replays a real report (fixtures/report.json, produced by
 * the actual crawler + analysis engine) and simulates a live scan over Server-Sent Events.
 *
 *   node scripts/demo/stub-api.mjs [port=4000]
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(new URL('./fixtures/report.json', import.meta.url), 'utf8'));
const ID = report.scanId;
const PORT = Number(process.argv[2] ?? 4000);
const PAGES = report.pagesScanned;
const user = { id: 'demo-user', email: 'demo@uidrift.dev' };
let loggedIn = false;
let startedAt = 0;

/** Scripted timeline (ms from scan start). */
const TIMELINE = [
  [0, 'queued', 'Queued', 0, 'Queued'],
  [700, 'page_started', `Crawling ${PAGES[0]}`, 0, 'Crawling page 1 of 4'],
  [1900, 'page_done', `Scanned ${PAGES[0]}`, 1, 'Crawled 1 of 4'],
  [2100, 'page_started', `Crawling ${PAGES[1]}`, 1, 'Crawling page 2 of 4'],
  [3200, 'page_done', `Scanned ${PAGES[1]}`, 2, 'Crawled 2 of 4'],
  [3400, 'page_started', `Crawling ${PAGES[2]}`, 2, 'Crawling page 3 of 4'],
  [4500, 'page_done', `Scanned ${PAGES[2]}`, 3, 'Crawled 3 of 4'],
  [4700, 'page_started', `Crawling ${PAGES[3]}`, 3, 'Crawling page 4 of 4'],
  [5800, 'page_done', `Scanned ${PAGES[3]}`, 4, 'Crawled 4 of 4'],
  [6100, 'analysing', 'Fingerprinting and grouping components', 4, 'Analysing'],
  [7600, 'done', `Done — score ${report.score.overall}`, 4, 'Done'],
];
const STATUS = {
  queued: 'queued',
  page_started: 'crawling',
  page_done: 'crawling',
  analysing: 'analysing',
  done: 'done',
};

const toEvent = ([t, type, message, pagesDone, step]) => ({
  type,
  scanId: ID,
  message,
  progress: { pagesDone, pagesTotal: 4, step },
  at: new Date(startedAt + t).toISOString(),
});

function scanState() {
  const elapsed = Date.now() - startedAt;
  const last = [...TIMELINE].reverse().find(([t]) => t <= elapsed) ?? TIMELINE[0];
  const e = toEvent(last);
  return {
    id: ID,
    url: report.url,
    domain: report.domain,
    status: STATUS[e.type],
    progress: e.progress,
    pagesScanned: e.type === 'done' ? PAGES : [],
    isDemo: false,
    isPublic: true,
    score: e.type === 'done' ? report.score.overall : undefined,
    createdAt: new Date(startedAt).toISOString(),
  };
}

const history = () =>
  [49, 58, report.score.overall]
    .map((score, i) => ({
      ...scanState(),
      status: 'done',
      score,
      createdAt: new Date(Date.UTC(2026, 9, 28 + i * 14)).toISOString(),
    }))
    .reverse();

createServer((req, res) => {
  const json = (body, status = 200) =>
    res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  const url = req.url ?? '';
  if (url === '/api/v1/health') return json({ status: 'ok', db: true, redis: true });
  if (url === '/api/v1/me') return json({ user: loggedIn ? user : null });
  if (url === '/api/v1/auth/login' || url === '/api/v1/auth/signup') {
    loggedIn = true;
    return json({ user });
  }
  if (url === '/api/v1/auth/logout') {
    loggedIn = false;
    return json({ ok: true });
  }
  if (url === '/api/v1/demos') {
    return json({
      demos: [
        { scanId: ID, url: report.url, domain: 'acme.example', score: report.score.overall },
        { scanId: ID, url: 'https://docs.example', domain: 'docs.example', score: 84 },
        { scanId: ID, url: 'https://shop.example', domain: 'shop.example', score: 47 },
      ],
    });
  }
  if (url === '/api/v1/me/scans') return json({ scans: history() });
  if (url === '/api/v1/scans' && req.method === 'POST') {
    startedAt = Date.now();
    return json({ scanId: ID, scan: scanState() }, 202);
  }
  if (url === `/api/v1/scans/${ID}`) return json({ scan: scanState() });
  if (url === `/api/v1/reports/${ID}`) return json({ report });
  if (url === `/api/v1/scans/${ID}/events`) {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    });
    res.write(`event: snapshot\ndata: ${JSON.stringify(scanState())}\n\n`);
    const elapsed = Date.now() - startedAt;
    const timers = TIMELINE.map((step) =>
      setTimeout(
        () => {
          const e = toEvent(step);
          res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
          if (e.type === 'done') res.end();
        },
        Math.max(0, step[0] - elapsed),
      ),
    );
    req.on('close', () => timers.forEach(clearTimeout));
    return;
  }
  json({ error: { code: 'NOT_FOUND', message: 'Not found in demo stub.' } }, 404);
}).listen(PORT, '127.0.0.1', () => console.log(`demo stub API on :${PORT}`));
