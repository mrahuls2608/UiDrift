/**
 * Scan a few public sites and save them as demo reports (isDemo: true), so the landing page
 * can show results instantly while the free server wakes up.
 *   npm run seed:demos -- https://example.com https://another.site
 */
import { connectDb, disconnectDb } from '../lib/db.js';
import { closeRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { Scan, type ScanDocument } from '../models/scan.model.js';
import { processScan } from '../services/pipeline.js';
import { assertPublicUrl } from '../services/crawler/url-guard.js';

const DEFAULT_SITES = [
  'https://www.gov.uk',
  'https://developer.mozilla.org',
  'https://www.python.org',
];

async function seed(raw: string) {
  const url = await assertPublicUrl(raw);
  const domain = url.hostname.replace(/^www\./, '');
  await Scan.deleteMany({ domain, isDemo: true });
  const scan = (await Scan.create({
    url: url.href,
    domain,
    maxPages: 5,
    isDemo: true,
    progress: { pagesDone: 0, pagesTotal: 5, step: 'Queued' },
  })) as ScanDocument;
  await processScan(scan._id.toString());
  const result = await Scan.findById(scan._id);
  logger.info(
    { url: url.href, status: result?.status, score: result?.score, error: result?.error },
    'demo scanned',
  );
}

async function main() {
  const sites = process.argv.slice(2).filter((a) => a.startsWith('http'));
  await connectDb();
  for (const site of sites.length ? sites : DEFAULT_SITES) await seed(site);
  await closeRedis();
  await disconnectDb();
}

main().catch((err) => {
  logger.error({ err }, 'seeding failed');
  process.exit(1);
});
