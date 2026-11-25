import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import type { ScanDTO } from '@uidrift/shared';

export const ANON_RETENTION_DAYS = 30;

const scanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    url: { type: String, required: true },
    domain: { type: String, required: true, index: true },
    maxPages: { type: Number, required: true, min: 1, max: 10 },
    status: {
      type: String,
      enum: ['queued', 'crawling', 'analysing', 'done', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    progress: {
      pagesDone: { type: Number, default: 0 },
      pagesTotal: { type: Number, default: 0 },
      step: { type: String, default: 'Queued' },
    },
    pagesScanned: { type: [String], default: [] },
    isDemo: { type: Boolean, default: false, index: true },
    isPublic: { type: Boolean, default: true },
    score: { type: Number },
    error: { type: String },
    completedAt: { type: Date },
    /** Set only for anonymous, non-demo scans. A TTL index deletes the scan after this date. */
    expireAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

scanSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
scanSchema.index({ userId: 1, createdAt: -1 });

export type ScanFields = InferSchemaType<typeof scanSchema> & { createdAt: Date };
export type ScanDocument = HydratedDocument<ScanFields>;
export const Scan = model('Scan', scanSchema);

export function anonExpiry(from = new Date()): Date {
  return new Date(from.getTime() + ANON_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function toScanDTO(scan: ScanDocument): ScanDTO {
  return {
    id: scan._id.toString(),
    url: scan.url,
    domain: scan.domain,
    status: scan.status,
    progress: {
      pagesDone: scan.progress?.pagesDone ?? 0,
      pagesTotal: scan.progress?.pagesTotal ?? 0,
      step: scan.progress?.step ?? '',
    },
    pagesScanned: scan.pagesScanned,
    isDemo: scan.isDemo,
    isPublic: scan.isPublic,
    error: scan.error ?? undefined,
    score: scan.score ?? undefined,
    createdAt: scan.createdAt.toISOString(),
    completedAt: scan.completedAt?.toISOString(),
  };
}
