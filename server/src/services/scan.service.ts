import type {
  CreateScanInput,
  CreateSourceScanInput,
  DemoDTO,
  LlmConfigInput,
  ScanDTO,
} from '@uidrift/shared';
import { env } from '../config/env.js';
import { AppError, forbidden, notFound } from '../lib/errors.js';
import { Scan, toScanDTO, type ScanDocument } from '../models/scan.model.js';
import { Report } from '../models/report.model.js';
import { assertPublicUrl } from './crawler/url-guard.js';
import { filterSourceFiles, parseGithubRepo } from './source/ingest.js';
import { enqueueScan } from '../queue/scan-queue.js';
import { publishScanEvent, requestCancel } from '../queue/events.js';
import { storeSourceFiles } from '../queue/source-store.js';
import { storeLlmConfig } from './insights/key-vault.js';
import { invalidateReport } from './report.service.js';

const ACTIVE = ['queued', 'crawling', 'analysing'];

function llmFields(llm?: LlmConfigInput) {
  return llm
    ? { insightsEngine: 'llm' as const, llmProvider: llm.provider, llmModel: llm.model }
    : { insightsEngine: 'rules' as const };
}

async function enqueue(scan: ScanDocument, llm: LlmConfigInput | undefined, total: number) {
  const id = scan._id.toString();
  if (llm) await storeLlmConfig(id, llm);
  const waiting = await enqueueScan(id);
  await publishScanEvent({
    type: 'queued',
    scanId: id,
    message: waiting > 1 ? `Queued — ${waiting - 1} audit(s) ahead of you` : 'Queued',
    progress: { pagesDone: 0, pagesTotal: total, step: 'Queued' },
    at: new Date().toISOString(),
  });
  return toScanDTO(scan);
}

/** Website audit (headless Chrome). Signed-in users only. */
export async function createScan(input: CreateScanInput, userId: string): Promise<ScanDTO> {
  const url = await assertPublicUrl(input.url, { allowPrivate: env.ALLOW_PRIVATE_URLS });
  const maxPages = Math.min(input.maxPages, env.MAX_PAGES);
  const scan = (await Scan.create({
    userId,
    kind: 'url',
    url: url.href,
    domain: url.hostname.replace(/^www\./, ''),
    maxPages,
    progress: { pagesDone: 0, pagesTotal: maxPages, step: 'Queued' },
    ...llmFields(input.llm),
  })) as ScanDocument;
  return enqueue(scan, input.llm, maxPages);
}

/** Source-code audit (static analysis): uploaded/pasted files or a public GitHub repository. */
export async function createSourceScan(
  input: CreateSourceScanInput,
  userId: string,
): Promise<ScanDTO> {
  const { source } = input;
  let label: string;
  let domain: string;
  let files: ReturnType<typeof filterSourceFiles> | undefined;
  if (source.type === 'github') {
    const { owner, repo, ref } = parseGithubRepo(source.repo);
    label = `https://github.com/${owner}/${repo}${ref ? `/tree/${ref}` : ''}`;
    domain = `github.com/${owner}/${repo}`;
  } else {
    files = filterSourceFiles(source.files);
    label = source.label;
    domain = source.label;
  }
  const scan = (await Scan.create({
    userId,
    kind: 'source',
    sourceType: source.type,
    url: label,
    domain,
    maxPages: 1,
    progress: { pagesDone: 0, pagesTotal: 1, step: 'Queued' },
    ...llmFields(input.llm),
  })) as ScanDocument;
  if (files) await storeSourceFiles(scan._id.toString(), files.files);
  return enqueue(scan, input.llm, 1);
}

/** Owners see their own audits; demo audits are visible to every signed-in user. */
export function canView(scan: ScanDocument, userId?: string): boolean {
  if (!userId) return false;
  return scan.isDemo || scan.userId?.toString() === userId;
}

export async function getScanDoc(id: string, userId?: string): Promise<ScanDocument> {
  const scan = (await Scan.findById(id)) as ScanDocument | null;
  if (!scan || !canView(scan, userId)) throw notFound('Scan');
  return scan;
}

export async function getScan(id: string, userId?: string): Promise<ScanDTO> {
  return toScanDTO(await getScanDoc(id, userId));
}

/** Owners cancel running audits and delete finished ones. Demo audits can't be changed. */
export async function cancelOrDeleteScan(
  id: string,
  userId: string,
): Promise<{ deleted: boolean }> {
  const scan = await getScanDoc(id, userId);
  if (scan.userId?.toString() !== userId) throw forbidden();
  if (ACTIVE.includes(scan.status)) {
    await requestCancel(id);
    scan.status = 'cancelled';
    scan.error = 'Cancelled by user';
    scan.completedAt = new Date();
    await scan.save();
    await publishScanEvent({
      type: 'cancelled',
      scanId: id,
      message: 'Audit cancelled',
      progress: { ...scan.progress, step: 'Cancelled' } as ScanDTO['progress'],
      at: new Date().toISOString(),
    });
    return { deleted: false };
  }
  await Promise.all([
    Scan.deleteOne({ _id: id }),
    Report.deleteOne({ scanId: id }),
    invalidateReport(id),
  ]);
  return { deleted: true };
}

export async function listUserScans(userId: string): Promise<ScanDTO[]> {
  const scans = (await Scan.find({ userId }).sort({ createdAt: -1 }).limit(200)) as ScanDocument[];
  return scans.map(toScanDTO);
}

export async function listDemos(): Promise<DemoDTO[]> {
  const scans = (await Scan.find({ isDemo: true, status: 'done' })
    .sort({ createdAt: -1 })
    .limit(8)) as ScanDocument[];
  return scans.map((s) => ({
    scanId: s._id.toString(),
    kind: s.kind ?? 'url',
    url: s.url,
    domain: s.domain,
    score: s.score ?? 0,
  }));
}

/** Audits left mid-flight by a crashed or restarted worker would otherwise spin forever. */
export async function failStaleScans(): Promise<number> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const res = await Scan.updateMany(
    { status: { $in: ['crawling', 'analysing'] }, createdAt: { $lt: cutoff } },
    {
      status: 'failed',
      error: 'The audit was interrupted. Please try again.',
      completedAt: new Date(),
    },
  );
  return res.modifiedCount;
}

export { AppError };
