import { beforeEach, describe, expect, it, vi } from 'vitest';
import { el, page } from './fixtures.js';

const scanDoc = {
  _id: { toString: () => 'scan1' },
  status: 'queued',
  url: 'https://a.test/',
  maxPages: 2,
  progress: { pagesDone: 0, pagesTotal: 2, step: 'Queued' },
  expireAt: undefined,
};
const updates: Array<Record<string, unknown>> = [];
const events: Array<{ type: string; message: string }> = [];
const reportWrite = vi.fn();

vi.mock('../src/models/scan.model.js', () => ({
  Scan: {
    findById: vi.fn(async () => ({ ...scanDoc })),
    updateOne: vi.fn(async (_q: unknown, u: Record<string, unknown>) => updates.push(u)),
    exists: vi.fn(async () => null),
  },
}));
vi.mock('../src/models/report.model.js', () => ({ Report: { findOneAndUpdate: reportWrite } }));
vi.mock('../src/queue/events.js', () => ({
  isCancelRequested: vi.fn(async () => false),
  publishScanEvent: vi.fn(async (e: { type: string; message: string }) => events.push(e)),
}));

const { processScan, friendlyError } = await import('../src/services/pipeline.js');

beforeEach(() => {
  updates.length = 0;
  events.length = 0;
  reportWrite.mockReset();
});

describe('processScan', () => {
  it('crawls, analyses, saves the report and marks the scan done', async () => {
    const crawl = vi.fn(
      async (opts: {
        onPageStarted?: (u: string, i: number, t: number) => unknown;
        onPageDone?: (u: string, i: number, t: number) => unknown;
      }) => {
        await opts.onPageStarted?.('https://a.test/', 1, 2);
        await opts.onPageDone?.('https://a.test/', 1, 2);
        return [page('https://a.test/', [el('button'), el('link')])];
      },
    );
    await processScan('scan1', { crawl: crawl as never });
    expect(events.map((e) => e.type)).toEqual([
      'page_started',
      'page_started',
      'page_done',
      'analysing',
      'done',
    ]);
    expect(reportWrite).toHaveBeenCalledOnce();
    const body = reportWrite.mock.calls[0]?.[1].body;
    expect(body.componentGroups).toHaveLength(2);
    expect(body.tokens.css).toContain(':root');
    expect(updates.at(-1)).toMatchObject({ status: 'done', pagesScanned: ['https://a.test/'] });
  });

  it('marks the scan failed with a friendly reason', async () => {
    const crawl = vi.fn(async () => {
      throw new Error('net::ERR_NAME_NOT_RESOLVED at https://a.test');
    });
    await processScan('scan1', { crawl: crawl as never });
    expect(updates.at(-1)).toMatchObject({
      status: 'failed',
      error: 'That domain could not be found.',
    });
    expect(events.at(-1)?.type).toBe('failed');
  });
});

describe('friendlyError', () => {
  it.each([
    ['HTTP 403', 'The site blocked the scan.'],
    ['Navigation timeout of 20000 ms exceeded', 'The site took too long to respond.'],
    ['net::ERR_CONNECTION_REFUSED', 'Could not connect to the site.'],
    ['HTTP 500', 'The site responded with an error (HTTP 500).'],
    ['weird', 'The scan failed unexpectedly. Please try again.'],
  ])('%s', (input, expected) => expect(friendlyError(new Error(input))).toBe(expected));
});
