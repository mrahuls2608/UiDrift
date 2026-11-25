import type { CreateScanInput, DemoDTO, ScanDTO } from '@uidrift/shared';
import { env } from '../config/env.js';
import { AppError, forbidden, notFound } from '../lib/errors.js';
import { Scan, anonExpiry, toScanDTO, type ScanDocument } from '../models/scan.model.js';
import { Report } from '../models/report.model.js';
import { assertPublicUrl } from './crawler/url-guard.js';
import { enqueueScan } from '../queue/scan-queue.js';
import { publishScanEvent, requestCancel } from '../queue/events.js';
import { invalidateReport } from './report.service.js';

const ACTIVE = ['queued', 'crawling', 'analysing'];

export async function createScan(input: CreateScanInput, userId?: string): Promise<ScanDTO> {
  const url = await assertPublicUrl(input.url, { allowPrivate: env.ALLOW_PRIVATE_URLS });
  const maxPages = Math.min(input.maxPages, env.MAX_PAGES);
  const scan = (await Scan.create({
    userId,
    url: url.href,
    domain: url.hostname.replace(/^www\./, ''),
    maxPages,
    progress: { pagesDone: 0, pagesTotal: maxPages, step: 'Queued' },
    expireAt: userId ? undefined : anonExpiry(),
  })) as ScanDocument;
  const waiting = await enqueueScan(scan._id.toString());
  await publishScanEvent({
    type: 'queued',
    scanId: scan._id.toString(),
    message: waiting > 1 ? `Queued — ${waiting - 1} scan(s) ahead of you` : 'Queued',
    progress: { pagesDone: 0, pagesTotal: maxPages, step: 'Queued' },
    at: new Date().toISOString(),
  });
  return toScanDTO(scan);
}

export function canView(scan: ScanDocument, userId?: string): boolean {
  return scan.isPublic || scan.isDemo || (!!userId && scan.userId?.toString() === userId);
}

export async function getScanDoc(id: string, userId?: string): Promise<ScanDocument> {
  const scan = (await Scan.findById(id)) as ScanDocument | null;
  if (!scan || !canView(scan, userId)) throw notFound('Scan');
  return scan;
}

export async function getScan(id: string, userId?: string): Promise<ScanDTO> {
  return toScanDTO(await getScanDoc(id, userId));
}

/** Running scans can be cancelled by whoever has the link (or the owner); finished ones deleted by the owner. */
export async function cancelOrDeleteScan(
  id: string,
  userId?: string,
): Promise<{ deleted: boolean }> {
  const scan = await getScanDoc(id, userId);
  const owner = scan.userId?.toString();
  if (owner && owner !== userId) throw forbidden();
  if (ACTIVE.includes(scan.status)) {
    await requestCancel(id);
    scan.status = 'cancelled';
    scan.error = 'Cancelled by user';
    scan.completedAt = new Date();
    await scan.save();
    await publishScanEvent({
      type: 'cancelled',
      scanId: id,
      message: 'Scan cancelled',
      progress: { ...scan.progress, step: 'Cancelled' } as ScanDTO['progress'],
      at: new Date().toISOString(),
    });
    return { deleted: false };
  }
  if (!owner)
    throw new AppError(403, 'FORBIDDEN', 'Only signed-in owners can delete finished scans.');
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
    url: s.url,
    domain: s.domain,
    score: s.score ?? 0,
  }));
}

/** Scans left mid-flight by a crashed or restarted worker would otherwise spin forever. */
export async function failStaleScans(): Promise<number> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const res = await Scan.updateMany(
    { status: { $in: ['crawling', 'analysing'] }, createdAt: { $lt: cutoff } },
    {
      status: 'failed',
      error: 'The scan was interrupted. Please try again.',
      completedAt: new Date(),
    },
  );
  return res.modifiedCount;
}
