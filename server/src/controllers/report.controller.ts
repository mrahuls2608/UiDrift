import type { Request, Response } from 'express';
import { exportFormatSchema } from '@uidrift/shared';
import { parse } from '../middleware/validate.js';
import { parseId } from '../lib/id.js';
import * as reports from '../services/report.service.js';

export async function show(req: Request, res: Response) {
  const report = await reports.getReport(parseId(req.params.scanId), req.userId);
  res.set('Cache-Control', 'private, max-age=300').json({ report });
}

export async function exportFile(req: Request, res: Response) {
  const format = parse(exportFormatSchema, req.query.format ?? 'css');
  const file = await reports.exportReport(parseId(req.params.scanId), format, req.userId);
  res
    .status(200)
    .set({
      'Content-Type': `${file.contentType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    })
    .send(file.body);
}
