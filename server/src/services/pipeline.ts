import type { ScanEvent, ScanEventType, ScanProgress } from '@uidrift/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { Scan, type ScanDocument } from '../models/scan.model.js';
import { Report } from '../models/report.model.js';
import { crawlSite, CrawlCancelledError, type CrawlOptions } from './crawler/crawler.js';
import { analyzePages } from './analysis/index.js';
import { generateArtifacts } from './generator/index.js';
import { isCancelRequested, publishScanEvent } from '../queue/events.js';

export interface PipelineDeps {
  crawl: (opts: CrawlOptions) => ReturnType<typeof crawlSite>;
}

/** Turn low-level browser errors into a reason the user can act on (PRD: clear failure reason). */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/robots\.txt/i.test(msg)) return msg;
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/i.test(msg)) return 'That domain could not be found.';
  if (/HTTP (401|403|429)|ERR_BLOCKED|Access Denied/i.test(msg))
    return 'The site blocked the scan.';
  if (/HTTP \d{3}/.test(msg))
    return `The site responded with an error (${msg.match(/HTTP \d{3}/)?.[0]}).`;
  if (/timeout|timed out/i.test(msg)) return 'The site took too long to respond.';
  if (/ERR_CONNECTION|ECONNREFUSED|ERR_SSL|ERR_CERT/i.test(msg))
    return 'Could not connect to the site.';
  if (/No pages/i.test(msg)) return msg;
  return 'The scan failed unexpectedly. Please try again.';
}

function emitter(scan: ScanDocument) {
  const scanId = scan._id.toString();
  return async (
    type: ScanEventType,
    message: string,
    progress: ScanProgress,
    extra: object = {},
  ) => {
    await Scan.updateOne({ _id: scanId }, { progress, ...extra });
    const event: ScanEvent = { type, scanId, message, progress, at: new Date().toISOString() };
    await publishScanEvent(event);
  };
}

const defaultDeps: PipelineDeps = { crawl: crawlSite };

/** Crawl → analyse → generate → save. Runs inside the BullMQ worker, one scan at a time. */
export async function processScan(scanId: string, deps: PipelineDeps = defaultDeps): Promise<void> {
  const scan = (await Scan.findById(scanId)) as ScanDocument | null;
  if (!scan || scan.status !== 'queued') return;
  const emit = emitter(scan);
  const total = scan.maxPages;
  const cancelled = async () =>
    (await isCancelRequested(scanId)) ||
    (await Scan.exists({ _id: scanId, status: 'cancelled' })) !== null;

  try {
    await emit(
      'page_started',
      'Starting browser',
      { pagesDone: 0, pagesTotal: total, step: 'Crawling' },
      { status: 'crawling' },
    );
    const pages = await deps.crawl({
      startUrl: scan.url,
      maxPages: total,
      allowPrivate: env.ALLOW_PRIVATE_URLS,
      isCancelled: cancelled,
      onPageStarted: (url, index) =>
        emit('page_started', `Crawling ${url}`, {
          pagesDone: index - 1,
          pagesTotal: total,
          step: `Crawling page ${index} of ${total}`,
        }),
      onPageDone: (url, index) =>
        emit('page_done', `Scanned ${url}`, {
          pagesDone: index,
          pagesTotal: total,
          step: `Crawled ${index} of ${total}`,
        }),
    });
    if (pages.length === 0) throw new Error('No pages could be scanned.');
    if (await cancelled()) throw new CrawlCancelledError();

    const done = pages.length;
    await emit(
      'analysing',
      'Fingerprinting and grouping components',
      { pagesDone: done, pagesTotal: done, step: 'Analysing' },
      { status: 'analysing' },
    );
    const analysis = analyzePages(pages);
    const artifacts = generateArtifacts(analysis);
    await Report.findOneAndUpdate(
      { scanId },
      { scanId, body: { ...analysis, ...artifacts }, expireAt: scan.expireAt },
      { upsert: true },
    );
    await emit(
      'done',
      `Done — score ${analysis.score.overall}`,
      { pagesDone: done, pagesTotal: done, step: 'Done' },
      {
        status: 'done',
        score: analysis.score.overall,
        pagesScanned: pages.map((p) => p.url),
        completedAt: new Date(),
      },
    );
  } catch (err) {
    if (err instanceof CrawlCancelledError) {
      logger.info({ scanId }, 'scan cancelled');
      return;
    }
    logger.warn({ scanId, err: (err as Error).message }, 'scan failed');
    const error = friendlyError(err);
    await emit(
      'failed',
      error,
      { ...(scan.progress as ScanProgress), step: 'Failed' },
      {
        status: 'failed',
        error,
        completedAt: new Date(),
      },
    );
  }
}
