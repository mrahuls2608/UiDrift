import type { ExportFormat, ReportDTO } from '@uidrift/shared';
import { AppError, notFound } from '../lib/errors.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { Report } from '../models/report.model.js';
import { getScanDoc } from './scan.service.js';

const cacheKey = (scanId: string) => `uidrift:report:${scanId}`;
const CACHE_TTL = 60 * 60;

type ReportBody = Omit<
  ReportDTO,
  'id' | 'scanId' | 'url' | 'domain' | 'pagesScanned' | 'createdAt'
>;

async function readCache(scanId: string): Promise<ReportDTO | null> {
  try {
    const hit = await redis().get(cacheKey(scanId));
    return hit ? (JSON.parse(hit) as ReportDTO) : null;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'report cache read failed');
    return null;
  }
}

export async function invalidateReport(scanId: string): Promise<void> {
  await redis()
    .del(cacheKey(scanId))
    .catch(() => undefined);
}

/** Reports never change once written, so they are cached in Redis after the first read. */
export async function getReport(scanId: string, userId?: string): Promise<ReportDTO> {
  const scan = await getScanDoc(scanId, userId);
  if (scan.status !== 'done') {
    throw new AppError(
      409,
      'REPORT_NOT_READY',
      `This scan is ${scan.status}; the report is not ready.`,
    );
  }
  const cached = await readCache(scanId);
  if (cached) return cached;

  const report = await Report.findOne({ scanId }).lean();
  if (!report) throw notFound('Report');
  const dto: ReportDTO = {
    ...(report.body as ReportBody),
    id: report._id.toString(),
    scanId,
    url: scan.url,
    domain: scan.domain,
    pagesScanned: scan.pagesScanned,
    createdAt: (scan.completedAt ?? scan.createdAt).toISOString(),
  };
  await redis()
    .set(cacheKey(scanId), JSON.stringify(dto), 'EX', CACHE_TTL)
    .catch(() => undefined);
  return dto;
}

export interface ExportFile {
  filename: string;
  contentType: string;
  body: string;
}

export async function exportReport(
  scanId: string,
  format: ExportFormat,
  userId?: string,
): Promise<ExportFile> {
  const report = await getReport(scanId, userId);
  if (format === 'css')
    return { filename: 'tokens.css', contentType: 'text/css', body: report.tokens.css };
  if (format === 'json') {
    return {
      filename: 'tokens.json',
      contentType: 'application/json',
      body: JSON.stringify(report.tokens.json, null, 2),
    };
  }
  return {
    filename: 'components.json',
    contentType: 'application/json',
    body: JSON.stringify({ files: report.components }, null, 2),
  };
}
