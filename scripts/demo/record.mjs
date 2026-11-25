/**
 * Records the UIDrift walkthrough video with Playwright.
 *
 *   node scripts/demo/stub-api.mjs &                     # demo API on :4000
 *   API_URL=http://127.0.0.1:4000 npm run start -w web   # or the standalone server
 *   node scripts/demo/record.mjs [baseUrl] [outDir]
 *
 * Frames come from the Chrome DevTools screencast (sharper than Playwright's built-in VP8
 * recorder) and are encoded to H.264 MP4 + WebM with ffmpeg. Requires `playwright` and `ffmpeg`.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000';
const OUT = resolve(process.argv[3] ?? 'docs/demo');
const FRAMES = join(OUT, '.frames');
const SCALE = 1.5; // 1280×720 CSS px → 1920×1080 video

/** Fake cursor + caption overlay, injected into every page. Never intercepts input. */
const OVERLAY = () => {
  const install = () => {
    if (document.getElementById('__demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #__demo-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;
        transform:translate(-100px,-100px);transition:transform 40ms linear}
      #__demo-cursor svg{filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
      #__demo-ripple{position:fixed;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;z-index:2147483646;
        pointer-events:none;border:2px solid #22c55e;opacity:0}
      #__demo-ripple.on{animation:__rip .45s ease-out}
      @keyframes __rip{from{transform:scale(.4);opacity:1}to{transform:scale(1.4);opacity:0}}
      #__demo-cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;
        max-width:min(860px,calc(100% - 32px));padding:12px 20px;border-radius:12px;background:rgba(2,6,23,.88);color:#f8fafc;
        font:500 17px/1.4 'IBM Plex Sans',system-ui,sans-serif;border:1px solid rgba(34,197,94,.45);
        box-shadow:0 10px 30px rgba(0,0,0,.4);opacity:0;transition:opacity .25s ease-out;text-align:center}
      #__demo-cap b{color:#4ade80;font-weight:600}`;
    document.head.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = '__demo-cursor';
    cursor.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#fff" stroke="#020617" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    const ripple = document.createElement('div');
    ripple.id = '__demo-ripple';
    const cap = document.createElement('div');
    cap.id = '__demo-cap';
    document.body.append(cursor, ripple, cap);
    const pos = JSON.parse(sessionStorage.getItem('__pos') || '[-100,-100]');
    cursor.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
    addEventListener(
      'mousemove',
      (e) => {
        cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
        sessionStorage.setItem('__pos', JSON.stringify([e.clientX, e.clientY]));
      },
      true,
    );
    addEventListener(
      'mousedown',
      (e) => {
        ripple.style.left = `${e.clientX}px`;
        ripple.style.top = `${e.clientY}px`;
        ripple.classList.remove('on');
        void ripple.offsetWidth;
        ripple.classList.add('on');
      },
      true,
    );
    window.__caption = (html) => {
      sessionStorage.setItem('__cap', html || '');
      cap.innerHTML = html || '';
      cap.style.opacity = html ? '1' : '0';
    };
    window.__caption(sessionStorage.getItem('__cap'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: SCALE,
    colorScheme: 'dark',
  });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();

  const caption = async (html) => {
    await page.waitForFunction(() => typeof window.__caption === 'function');
    await page.evaluate((h) => window.__caption(h), html);
  };
  const moveTo = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error('element not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 28 });
    await sleep(250);
  };
  const click = async (locator) => {
    await moveTo(locator);
    await locator.click();
  };
  const scrollTo = async (selector, offset = -96) => {
    await page.evaluate(
      ([sel, off]) => {
        const el = document.querySelector(sel);
        if (el)
          window.scrollTo({
            top: el.getBoundingClientRect().top + scrollY + off,
            behavior: 'smooth',
          });
      },
      [selector, offset],
    );
    await sleep(1100);
  };
  const scrollBy = async (dy, wait = 900) => {
    await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), dy);
    await sleep(wait);
  };

  // Screencast: frames arrive only when pixels change, each with its own timestamp.
  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(FRAMES, `${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.mouse.move(900, 420);
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  });

  // 1 — Landing
  await caption('<b>UIDrift</b> finds the UI drift hiding in your website');
  await sleep(3200);
  await caption(
    'Every button, input, heading, link and card — grouped by its <b>real computed styles</b>',
  );
  await scrollTo('#features');
  await sleep(2600);
  await scrollBy(420, 2200);
  await caption('Crawl → Fingerprint → Group → Fix');
  await scrollTo('#how');
  await sleep(2400);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(1200);

  // 2 — Start a scan
  await caption('Paste any public URL and press <b>Scan</b>');
  const input = page.getByLabel('Website URL').first();
  await click(input);
  await input.pressSequentially('acme.example', { delay: 90 });
  await sleep(500);
  await click(page.getByRole('button', { name: 'Scan' }).first());

  // 3 — Live progress
  await page.waitForURL(/\/scan\//);
  await caption(
    'Live progress streamed over <b>Server-Sent Events</b> (BullMQ worker + Redis pub/sub)',
  );
  await page.waitForURL(/\/report\//, { timeout: 30_000 });
  await page.waitForSelector('#overview');
  await sleep(600);

  // 4 — Report
  await caption('A <b>0–100 consistency score</b> with a weighted breakdown per category');
  await sleep(3800);
  const nav = page.getByRole('navigation', { name: 'Report sections' });
  await caption('Where the drift is: <b>10 button variants</b> where 3 would do');
  await click(nav.getByRole('link', { name: 'Summary' }));
  await sleep(2800);
  await caption(
    'Each variant rendered from captured styles — the most used become your <b>standard</b>',
  );
  await click(nav.getByRole('link', { name: 'Components' }));
  await sleep(2200);
  await scrollBy(380, 1800);
  await scrollBy(-380, 900);
  const tabs = page.getByRole('tablist', { name: 'Component types' });
  await click(tabs.getByRole('tab', { name: /Inputs/ }));
  await sleep(1500);
  await click(tabs.getByRole('tab', { name: /Headings/ }));
  await sleep(1500);
  await click(tabs.getByRole('tab', { name: /Cards/ }));
  await sleep(1500);
  await caption('Near-identical colors merged with <b>CIEDE2000 (ΔE &lt; 3)</b>');
  await click(nav.getByRole('link', { name: 'Colors' }));
  await sleep(2600);
  await caption(
    'Font size, spacing and radius sprawl — every chart has a <b>table alternative</b>',
  );
  await click(nav.getByRole('link', { name: 'Typography' }));
  await sleep(2200);
  await click(nav.getByRole('link', { name: 'Spacing & Radius' }));
  await sleep(2400);
  await caption('<b>axe-core</b> accessibility issues with element, page and fix');
  await click(nav.getByRole('link', { name: 'Accessibility' }));
  await sleep(2600);
  await caption(
    'Export <b>tokens.css</b>, <b>tokens.json</b> and typed React components — or download a ZIP',
  );
  await click(nav.getByRole('link', { name: 'Export' }));
  await sleep(2200);
  const exportTabs = page.getByRole('tablist', { name: 'Export formats' });
  await click(exportTabs.getByRole('tab', { name: 'tokens.json' }));
  await sleep(1500);
  await click(exportTabs.getByRole('tab', { name: 'React components' }));
  await sleep(1200);
  await scrollBy(360, 2000);

  // 5 — Accounts + history
  await caption('Log in to save scans and <b>track your score over time</b>');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(900);
  await click(page.getByRole('link', { name: 'Log in' }));
  await page.waitForURL(/\/login/);
  await sleep(600);
  const email = page.getByLabel('Email');
  await click(email);
  await email.pressSequentially('demo@uidrift.dev', { delay: 55 });
  const password = page.getByLabel('Password');
  await click(password);
  await password.pressSequentially('correct-horse', { delay: 55 });
  await click(page.getByRole('button', { name: 'Log in' }));
  await page.waitForURL(/\/dashboard/);
  await page.waitForSelector('table');
  await caption('Every saved scan with one-click <b>Re-scan</b> and a score-history chart');
  await sleep(2600);
  await scrollBy(420, 2600);

  // 6 — Theme
  await caption(
    'Dark by default, with a WCAG AA <b>light theme</b> — keyboard and screen-reader friendly',
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(800);
  await click(page.getByRole('button', { name: /Switch to light theme/ }));
  await sleep(2400);
  await caption('<b>github.com/mrahuls2608/UiDrift</b>');
  await sleep(2600);

  await cdp.send('Page.stopScreencast');
  await browser.close();
  encode(frames);
}

function encode(frames) {
  if (frames.length < 2) throw new Error('no frames captured');
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1]?.t ?? frames[i].t + 1.5;
    lines.push(
      `file '${frames[i].file}'`,
      `duration ${Math.max(0.001, next - frames[i].t).toFixed(4)}`,
    );
  }
  lines.push(`file '${frames.at(-1).file}'`);
  const list = join(FRAMES, 'list.txt');
  writeFileSync(list, lines.join('\n'));
  const vf =
    'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0b1120,fps=30,format=yuv420p';
  const mp4 = join(OUT, 'uidrift-demo.mp4');
  const webm = join(OUT, 'uidrift-demo.webm');
  const ff = (args) =>
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  ff([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    list,
    '-vf',
    vf,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '22',
    '-movflags',
    '+faststart',
    mp4,
  ]);
  ff([
    '-i',
    mp4,
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '36',
    '-row-mt',
    '1',
    '-deadline',
    'good',
    '-cpu-used',
    '4',
    webm,
  ]);
  ff(['-ss', '8', '-i', mp4, '-frames:v', '1', '-q:v', '3', join(OUT, 'uidrift-demo-poster.jpg')]);
  rmSync(FRAMES, { recursive: true, force: true });
  console.log(`wrote ${mp4}, ${webm} (${frames.length} frames)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
