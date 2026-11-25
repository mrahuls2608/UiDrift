/**
 * Records the UIDrift walkthrough video with Playwright.
 *
 *   npm run demo:fixtures -w server                       # real reports for the demo API
 *   node scripts/demo/stub-api.mjs &                      # demo API on :4000 (no Mongo/Redis needed)
 *   API_URL=http://127.0.0.1:4000 node web/.next/standalone/web/server.js &
 *   node scripts/demo/record.mjs [baseUrl] [outDir]
 *
 * Frames come from the Chrome DevTools screencast (sharper than Playwright's built-in VP8
 * recorder) and are encoded to H.264 MP4 with ffmpeg. Requires `playwright` and `ffmpeg`.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000';
const OUT = resolve(process.argv[3] ?? 'docs/demo');
const FRAMES = join(OUT, '.frames');
const SAMPLE = resolve(new URL('../../samples/acme-ui', import.meta.url).pathname);
const SCALE = 1.5; // 1280×720 CSS px → 1920×1080 video

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

/** ZIP the bundled sample project (what a user would upload) with the system `zip`/python. */
function sampleZip() {
  const zip = join(tmpdir(), 'acme-ui.zip');
  rmSync(zip, { force: true });
  execFileSync('python3', [
    '-c',
    `
import os, sys, zipfile
root, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(root):
        for f in fs:
            p = os.path.join(d, f)
            z.write(p, os.path.join('acme-ui', os.path.relpath(p, root)))
`,
    SAMPLE,
    zip,
  ]);
  return zip;
}

async function main() {
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });
  const zipPath = sampleZip();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: SCALE,
  });
  await context.addInitScript(OVERLAY);
  await context.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__theme-set')) {
        localStorage.setItem('uidrift-theme', 'light');
        sessionStorage.setItem('__theme-set', '1');
      }
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();

  const caption = async (html) => {
    await page.waitForFunction(() => typeof window.__caption === 'function');
    await page.evaluate((h) => window.__caption(h), html);
  };
  const moveTo = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error('element not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 26 });
    await sleep(220);
  };
  const click = async (locator) => {
    await moveTo(locator);
    await locator.click();
  };
  const scrollTo = async (selector, offset = -110) => {
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
  const top = async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(900);
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
  await page.mouse.move(900, 400);
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  });

  // 1 — Landing
  await caption('<b>UIDrift</b> finds the UI drift hiding in your product');
  await sleep(3400);
  await caption('Audit a <b>live website</b> or your <b>source code</b> — AI is optional');
  await scrollTo('#features');
  await sleep(1200);
  await click(page.getByRole('button', { name: 'Next features' }));
  await sleep(1300);
  await click(page.getByRole('button', { name: 'Next features' }));
  await sleep(1300);
  await caption('Deterministic by default — add your own Claude or OpenAI key only if you want');
  await scrollTo('#security');
  await sleep(2600);
  await top();

  // 2 — Login (everything after the landing page needs an account)
  await caption('Everything after the landing page requires an account');
  await click(page.getByRole('link', { name: 'Log in' }));
  await page.waitForURL(/\/login/);
  await sleep(1200);
  await caption('Seeded demo users make it one click — <b>demo@uidrift.dev</b>');
  await click(page.getByRole('button', { name: /Log in as demo user/ }));
  await page.waitForURL(/\/dashboard/);
  await page.waitForSelector('table');
  await caption('Your audits, score history and ready-made demo reports');
  await sleep(2400);
  await scrollBy(560, 2400);
  await scrollBy(520, 2000);
  await top();

  // 3 — Source-code audit, no AI
  await caption(
    'New audit → <b>Source code</b>: upload a ZIP, a folder, a GitHub repo or pasted files',
  );
  await click(page.getByRole('link', { name: 'New audit' }).first());
  await page.waitForURL(/\/new/);
  await sleep(900);
  await click(page.locator('main label', { hasText: 'Source code' }));
  await sleep(700);
  await moveTo(page.getByRole('button', { name: 'Choose ZIP' }));
  await page.setInputFiles('input[aria-label="ZIP file"]', zipPath);
  await page.waitForSelector('text=files ready');
  await caption('Only style and markup files are read — in the browser — and uploaded');
  await sleep(2400);
  await caption('Insights: <b>rule-based, no AI</b> (the default)');
  await moveTo(page.locator('main label', { hasText: 'Rule-based (no AI)' }));
  await sleep(1400);
  await click(page.getByRole('button', { name: 'Start audit' }));

  await page.waitForURL(/\/scan\//);
  await caption('Static analysis of CSS, SCSS, Tailwind, styled-components, JSX, Vue and HTML');
  await page.waitForURL(/\/report\//, { timeout: 30_000 });
  await page.waitForSelector('#overview');
  await sleep(600);

  // 4 — Report
  await caption('A 0–100 score with a weighted breakdown — same scoring for code and websites');
  await sleep(3600);
  const nav = page.getByRole('navigation', { name: 'Report sections' });
  await caption('<b>What to fix first</b>: prioritized, data-backed recommendations');
  await click(nav.getByRole('link', { name: 'Insights' }));
  await sleep(2600);
  await scrollBy(420, 2200);
  await caption(
    '11 button variants across CSS, Tailwind and styled-components — with <b>file:line</b>',
  );
  await click(nav.getByRole('link', { name: 'Components' }));
  await sleep(2000);
  await scrollBy(360, 1800);
  await scrollBy(-360, 800);
  await caption('Accessibility issues found statically — contrast ratios, labels, alt text, focus');
  await click(nav.getByRole('link', { name: 'Accessibility' }));
  await sleep(2800);
  await caption('Export <b>tokens.css</b>, <b>tokens.json</b> and typed React components');
  await click(nav.getByRole('link', { name: 'Export' }));
  await sleep(1400);
  await click(
    page
      .getByRole('tablist', { name: 'Export formats' })
      .getByRole('tab', { name: 'React components' }),
  );
  await sleep(2000);

  // 5 — Bring your own LLM (optional), then a website audit
  await top();
  await caption('Want AI-written insights? Bring your own key — typed per audit, never stored');
  await click(page.getByRole('link', { name: 'New audit' }).first());
  await page.waitForURL(/\/new/);
  await sleep(700);
  const url = page.getByLabel('Website URL');
  await click(url);
  await url.pressSequentially('acme.example', { delay: 80 });
  await click(page.locator('main label', { hasText: 'Use my own LLM' }));
  await sleep(900);
  await moveTo(page.getByLabel('Provider'));
  await sleep(900);
  const key = page.getByLabel('API key');
  await click(key);
  await key.pressSequentially('sk-ant-••••••••••••', { delay: 40 });
  await sleep(1600);
  await caption('Scores and tokens never depend on the LLM — it only rewrites the insights');
  await sleep(2400);
  await click(page.locator('main label', { hasText: 'Rule-based (no AI)' }));
  await sleep(600);
  await caption('Website audits crawl up to 10 pages in headless Chrome, live over SSE');
  await click(page.getByRole('button', { name: 'Start audit' }));
  await page.waitForURL(/\/scan\//);
  await page.waitForURL(/\/report\//, { timeout: 40_000 });
  await page.waitForSelector('#overview');
  await sleep(2600);

  // 6 — Theme + outro
  await caption('Light and dark themes, keyboard and screen-reader friendly');
  await click(page.getByRole('button', { name: /Switch to dark theme/ }));
  await sleep(2600);
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
  ff(['-ss', '8', '-i', mp4, '-frames:v', '1', '-q:v', '3', join(OUT, 'uidrift-demo-poster.jpg')]);
  rmSync(FRAMES, { recursive: true, force: true });
  console.log(`wrote ${mp4} (${frames.length} frames)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
