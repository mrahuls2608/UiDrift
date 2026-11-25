import puppeteer, { type Browser } from 'puppeteer';
import { env } from '../../config/env.js';

/** Memory-safe launch flags for small free-tier containers. */
export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    executablePath: env.CHROME_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--mute-audio',
    ],
  });
}
