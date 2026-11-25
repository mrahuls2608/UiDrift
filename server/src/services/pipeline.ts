import type {
  LlmConfigInput,
  ReportDTO,
  ScanEvent,
  ScanEventType,
  ScanKind,
  ScanProgress,
  SourceMeta,
} from '@uidrift/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { Scan, type ScanDocument } from '../models/scan.model.js';
import { Report } from '../models/report.model.js';
import { crawlSite, CrawlCancelledError, type CrawlOptions } from './crawler/crawler.js';
import { analyzeData, analyzePages, type AnalysisResult } from './analysis/index.js';
import { generateArtifacts } from './generator/index.js';
import { analyzeSource } from './source/index.js';
import { fetchGithubRepo, filterSourceFiles, type IngestResult } from './source/ingest.js';
import { buildInsights } from './insights/index.js';
import { takeLlmConfig } from './insights/key-vault.js';
import { isCancelRequested, publishScanEvent } from '../queue/events.js';
import { takeSourceFiles } from '../queue/source-store.js';

export interface PipelineDeps {
  crawl: (opts: CrawlOptions) => ReturnType<typeof crawlSite>;
  fetchRepo: (repo: string) => Promise<IngestResult>;
  fetchImpl?: typeof fetch;
}

export type ReportBody = Omit<
  ReportDTO,
  'id' | 'scanId' | 'url' | 'domain' | 'pagesScanned' | 'createdAt'
>;

/** Turn low-level errors into a reason the user can act on (PRD: clear failure reason). */
export function friendlyError(err: unknown): string {
  if (err instanceof AppError) return err.message;
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
  if (/No pages|source files/i.test(msg)) return msg;
  return 'The audit failed unexpectedly. Please try again.';
}

/**
 * Shared final step for the worker, the seed script and the CLI: analysis → tokens + React
 * components → insights (rules, optionally rewritten by the user's LLM).
 */
export async function buildReportBody(
  analysis: AnalysisResult,
  opts: {
    kind: ScanKind;
    target: string;
    llm?: LlmConfigInput | null;
    source?: SourceMeta;
    fetchImpl?: typeof fetch;
  },
): Promise<ReportBody> {
  const insights = await buildInsights(analysis, opts.target, opts.llm, opts.fetchImpl);
  return {
    ...analysis,
    ...generateArtifacts(analysis),
    insights,
    kind: opts.kind,
    ...(opts.source ? { source: opts.source } : {}),
  };
}

type Emit = (
  type: ScanEventType,
  message: string,
  progress: ScanProgress,
  extra?: object,
) => Promise<void>;

function emitter(scan: ScanDocument): Emit {
  const scanId = scan._id.toString();
  return async (type, message, progress, extra = {}) => {
    await Scan.updateOne({ _id: scanId }, { progress, ...extra });
    const event: ScanEvent = { type, scanId, message, progress, at: new Date().toISOString() };
    await publishScanEvent(event);
  };
}

const defaultDeps: PipelineDeps = { crawl: crawlSite, fetchRepo: (repo) => fetchGithubRepo(repo) };

interface Analysed {
  analysis: AnalysisResult;
  pagesScanned: string[];
  source?: SourceMeta;
}

async function crawlAndAnalyse(
  scan: ScanDocument,
  emit: Emit,
  deps: PipelineDeps,
  cancelled: () => Promise<boolean>,
): Promise<Analysed> {
  const total = scan.maxPages;
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
  await emit(
    'analysing',
    'Fingerprinting and grouping components',
    { pagesDone: pages.length, pagesTotal: pages.length, step: 'Analysing' },
    { status: 'analysing' },
  );
  return { analysis: analyzePages(pages), pagesScanned: pages.map((p) => p.url) };
}

async function readAndAnalyse(
  scan: ScanDocument,
  emit: Emit,
  deps: PipelineDeps,
): Promise<Analysed> {
  const id = scan._id.toString();
  const github = scan.sourceType === 'github';
  await emit(
    'page_started',
    github ? `Downloading ${scan.url}` : 'Reading uploaded files',
    { pagesDone: 0, pagesTotal: 1, step: github ? 'Fetching repository' : 'Reading files' },
    { status: 'crawling' },
  );
  let ingest: IngestResult;
  if (github) ingest = await deps.fetchRepo(scan.url);
  else {
    const files = await takeSourceFiles(id);
    if (!files)
      throw new AppError(
        410,
        'SOURCE_EXPIRED',
        'The uploaded files expired before the audit ran. Please upload them again.',
      );
    ingest = filterSourceFiles(files);
  }
  await emit('page_done', `Parsing ${ingest.files.length} style and markup files`, {
    pagesDone: 1,
    pagesTotal: 1,
    step: 'Parsing source',
  });
  const src = analyzeSource(ingest.files, ingest.received);
  await emit(
    'analysing',
    `Grouping ${src.elements.length} component definitions from ${src.meta.styleBlocks} style blocks`,
    { pagesDone: 1, pagesTotal: 1, step: 'Analysing' },
    { status: 'analysing' },
  );
  return {
    analysis: analyzeData(src),
    pagesScanned: [...new Set(src.elements.map((e) => e.page.replace(/:\d+$/, '')))],
    source: src.meta,
  };
}

/** One audit end to end. Runs inside the BullMQ worker, one at a time. */
export async function processScan(scanId: string, deps: PipelineDeps = defaultDeps): Promise<void> {
  const scan = (await Scan.findById(scanId)) as ScanDocument | null;
  if (!scan || scan.status !== 'queued') return;
  const emit = emitter(scan);
  const cancelled = async () =>
    (await isCancelRequested(scanId)) ||
    (await Scan.exists({ _id: scanId, status: 'cancelled' })) !== null;

  try {
    const kind: ScanKind = scan.kind ?? 'url';
    const { analysis, pagesScanned, source } =
      kind === 'source'
        ? await readAndAnalyse(scan, emit, deps)
        : await crawlAndAnalyse(scan, emit, deps, cancelled);
    if (await cancelled()) throw new CrawlCancelledError();

    let llm: LlmConfigInput | null = null;
    if (scan.insightsEngine === 'llm') {
      llm = await takeLlmConfig(scanId);
      await emit(
        'analysing',
        llm
          ? `Writing insights with ${scan.llmProvider}`
          : 'API key expired — using rule-based insights',
        { ...(scan.progress as ScanProgress), step: 'Writing insights' },
      );
    }
    const body = await buildReportBody(analysis, {
      kind,
      target: scan.domain,
      llm,
      source,
      fetchImpl: deps.fetchImpl,
    });
    if (scan.insightsEngine === 'llm' && !llm)
      body.insights.fallbackReason = 'The API key expired before the audit ran.';
    await Report.findOneAndUpdate(
      { scanId },
      { scanId, body, expireAt: scan.expireAt },
      { upsert: true },
    );
    const n = pagesScanned.length;
    await emit(
      'done',
      `Done — score ${analysis.score.overall}`,
      { pagesDone: n, pagesTotal: n, step: 'Done' },
      {
        status: 'done',
        score: analysis.score.overall,
        pagesScanned,
        completedAt: new Date(),
      },
    );
  } catch (err) {
    if (err instanceof CrawlCancelledError) {
      logger.info({ scanId }, 'audit cancelled');
      return;
    }
    logger.warn({ scanId, err: (err as Error).message }, 'audit failed');
    if (scan.insightsEngine === 'llm') await takeLlmConfig(scanId).catch(() => null); // discard the key
    const error = friendlyError(err);
    await emit(
      'failed',
      error,
      { ...(scan.progress as ScanProgress), step: 'Failed' },
      { status: 'failed', error, completedAt: new Date() },
    );
  }
}
