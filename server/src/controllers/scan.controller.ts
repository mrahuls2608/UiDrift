import type { Request, Response } from 'express';
import { createScanSchema, type ScanEvent } from '@uidrift/shared';
import { parse } from '../middleware/validate.js';
import { parseId } from '../lib/id.js';
import * as scans from '../services/scan.service.js';
import { recentScanEvents, scanEventBus, TERMINAL_EVENTS } from '../queue/events.js';
import { toScanDTO } from '../models/scan.model.js';

export async function create(req: Request, res: Response) {
  const input = parse(createScanSchema, req.body);
  const scan = await scans.createScan(input, req.userId);
  res.status(202).json({ scanId: scan.id, scan });
}

export async function show(req: Request, res: Response) {
  res.json({ scan: await scans.getScan(parseId(req.params.id), req.userId) });
}

export async function remove(req: Request, res: Response) {
  res.json(await scans.cancelOrDeleteScan(parseId(req.params.id), req.userId));
}

const HEARTBEAT_MS = 15_000;

/** Server-Sent Events: a snapshot, the recent log, then live events until a terminal event. */
export async function events(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const scan = await scans.getScanDoc(id, req.userId);

  // no-transform stops compression middleware (e.g. the Next.js rewrite proxy) from buffering the stream.
  res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const write = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  write('snapshot', toScanDTO(scan));
  if (['done', 'failed', 'cancelled'].includes(scan.status)) {
    res.end();
    return;
  }

  let closed = false;
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  };
  const unsubscribe = scanEventBus.subscribe(id, (event: ScanEvent) => {
    write(event.type, event);
    if (TERMINAL_EVENTS.includes(event.type)) cleanup();
  });
  req.on('close', cleanup);

  for (const event of await recentScanEvents(id)) write(event.type, event);
}

export async function demos(_req: Request, res: Response) {
  res.json({ demos: await scans.listDemos() });
}

export async function mine(req: Request, res: Response) {
  res.json({ scans: await scans.listUserScans(req.userId as string) });
}
