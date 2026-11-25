import { Schema, model } from 'mongoose';

/**
 * Report documents are written once by the worker and read many times, so the analysed body
 * is stored as a single sub-document (kept well under Mongo's 1 MB limit by the crawler caps).
 */
const reportSchema = new Schema(
  {
    scanId: { type: Schema.Types.ObjectId, ref: 'Scan', required: true, unique: true },
    body: { type: Schema.Types.Mixed, required: true },
    /** Mirrors the scan's TTL so anonymous reports are cleaned up with their scans. */
    expireAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

reportSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const Report = model('Report', reportSchema);
