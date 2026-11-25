import { beforeEach, describe, expect, it, vi } from 'vitest';
import { el, page } from './fixtures.js';

let scanDoc: Record<string, unknown>;
const updates: Array<Record<string, unknown>> = [];
const events: Array<{ type: string; message: string }> = [];
const reportWrite = vi.fn();
const llmVault = new Map<string, unknown>();
const sourceStore = new Map<string, unknown>();

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
vi.mock('../src/services/insights/key-vault.js', () => ({
  takeLlmConfig: vi.fn(async (id: string) => {
    const v = llmVault.get(id) ?? null;
    llmVault.delete(id);
    return v;
  }),
}));
vi.mock('../src/queue/source-store.js', () => ({
  takeSourceFiles: vi.fn(async (id: string) => {
    const v = sourceStore.get(id) ?? null;
    sourceStore.delete(id);
    return v;
  }),
}));

const { processScan, friendlyError } = await import('../src/services/pipeline.js');

const crawlOk = vi.fn(
  async (opts: {
    onPageStarted?: (u: string, i: number, t: number) => unknown;
    onPageDone?: (u: string, i: number, t: number) => unknown;
  }) => {
    await opts.onPageStarted?.('https://a.test/', 1, 2);
    await opts.onPageDone?.('https://a.test/', 1, 2);
    return [page('https://a.test/', [el('button'), el('link')])];
  },
);
const deps = (extra: Record<string, unknown> = {}) => ({
  crawl: crawlOk as never,
  fetchRepo: vi.fn() as never,
  ...extra,
});
const body = () => reportWrite.mock.calls[0]?.[1].body;

beforeEach(() => {
  updates.length = 0;
  events.length = 0;
  reportWrite.mockReset();
  llmVault.clear();
  sourceStore.clear();
  scanDoc = {
    _id: { toString: () => 'scan1' },
    kind: 'url',
    status: 'queued',
    url: 'https://a.test/',
    domain: 'a.test',
    maxPages: 2,
    insightsEngine: 'rules',
    progress: { pagesDone: 0, pagesTotal: 2, step: 'Queued' },
  };
});

describe('processScan — website audits', () => {
  it('crawls, analyses, writes rule-based insights and marks the audit done', async () => {
    await processScan('scan1', deps());
    expect(events.map((e) => e.type)).toEqual([
      'page_started',
      'page_started',
      'page_done',
      'analysing',
      'done',
    ]);
    expect(body().componentGroups).toHaveLength(2);
    expect(body().tokens.css).toContain(':root');
    expect(body().kind).toBe('url');
    expect(body().insights.engine).toBe('rules');
    expect(body().insights.summary).toMatch(/^a\.test scores \d+\/100/);
    expect(updates.at(-1)).toMatchObject({ status: 'done', pagesScanned: ['https://a.test/'] });
  });

  it('marks the audit failed with a friendly reason', async () => {
    const crawl = vi.fn(async () => {
      throw new Error('net::ERR_NAME_NOT_RESOLVED at https://a.test');
    });
    await processScan('scan1', deps({ crawl }));
    expect(updates.at(-1)).toMatchObject({
      status: 'failed',
      error: 'That domain could not be found.',
    });
    expect(events.at(-1)?.type).toBe('failed');
  });
});

describe('processScan — source audits', () => {
  const files = [
    {
      path: 'src/a.css',
      content:
        '.btn-primary { background: #2563eb; color: #fff; padding: 8px 16px; border-radius: 6px; }',
    },
    {
      path: 'src/B.tsx',
      content:
        '<button className="bg-blue-600 text-white px-4 py-2 rounded-md">Go</button><img src="x.png" />',
    },
  ];

  it('reads uploaded files once, analyses them statically and records file locations', async () => {
    scanDoc = {
      ...scanDoc,
      kind: 'source',
      sourceType: 'files',
      url: 'app.zip',
      domain: 'app.zip',
      maxPages: 1,
    };
    sourceStore.set('scan1', files);
    await processScan('scan1', deps());
    expect(sourceStore.has('scan1')).toBe(false);
    expect(body().kind).toBe('source');
    expect(body().source).toMatchObject({
      filesAnalyzed: 2,
      frameworks: ['React', 'Tailwind CSS'],
    });
    const buttons = body().componentGroups.filter((g: { type: string }) => g.type === 'button');
    expect(buttons).toHaveLength(1); // CSS and Tailwind define the same button
    expect(buttons[0].pages).toEqual(['src/a.css:1', 'src/B.tsx:1']);
    expect(body().a11y.map((i: { id: string }) => i.id)).toContain('image-alt');
    expect(updates.at(-1)).toMatchObject({
      status: 'done',
      pagesScanned: ['src/a.css', 'src/B.tsx'],
    });
  });

  it('downloads GitHub repositories through the repo fetcher', async () => {
    scanDoc = {
      ...scanDoc,
      kind: 'source',
      sourceType: 'github',
      url: 'https://github.com/acme/ui',
      domain: 'github.com/acme/ui',
      maxPages: 1,
    };
    const fetchRepo = vi.fn(async () => ({ files, received: 5 }));
    await processScan('scan1', deps({ fetchRepo }));
    expect(fetchRepo).toHaveBeenCalledWith('https://github.com/acme/ui');
    expect(body().source.filesReceived).toBe(5);
  });

  it('fails clearly when uploaded files have expired', async () => {
    scanDoc = {
      ...scanDoc,
      kind: 'source',
      sourceType: 'files',
      url: 'x',
      domain: 'x',
      maxPages: 1,
    };
    await processScan('scan1', deps());
    expect(updates.at(-1)).toMatchObject({
      status: 'failed',
      error: expect.stringMatching(/expired/),
    });
  });
});

describe('processScan — optional LLM insights', () => {
  const openAiReply = (content: unknown) =>
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
          { status: 200 },
        ),
    );

  it('uses the user-supplied key once and keeps scores identical to the rule-based run', async () => {
    await processScan('scan1', deps());
    const rulesBody = structuredClone(body());
    reportWrite.mockReset();

    scanDoc = { ...scanDoc, insightsEngine: 'llm', llmProvider: 'openai' };
    llmVault.set('scan1', { provider: 'openai', apiKey: 'sk-test-123456', model: 'gpt-test' });
    const fetchImpl = openAiReply({
      summary: 'LLM summary.',
      recommendations: [
        { title: 'Do X', detail: 'Use #4f46e5.', impact: 'high', category: 'colors' },
      ],
      tokenNames: [
        { value: '#4F46E5', name: 'primary', reason: 'button' },
        { value: '#abcdef', name: 'made-up', reason: 'not in data' },
      ],
    });
    await processScan('scan1', deps({ fetchImpl }));
    const llmBody = body();
    expect(llmVault.has('scan1')).toBe(false);
    expect(llmBody.insights).toMatchObject({
      engine: 'llm',
      provider: 'openai',
      model: 'gpt-test',
      summary: 'LLM summary.',
    });
    expect(llmBody.insights.tokenNames).toEqual([
      { value: '#4f46e5', name: 'primary', reason: 'button' },
    ]);
    // Same analysis either way — only the wording of the insights differs.
    const { insights: _a, ...restRules } = rulesBody;
    const { insights: _b, ...restLlm } = llmBody;
    expect(restLlm).toEqual(restRules);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-test-123456');
    expect(String(init.body)).not.toContain('sk-test');
  });

  it('falls back to rule-based insights when the LLM fails, without failing the audit', async () => {
    scanDoc = { ...scanDoc, insightsEngine: 'llm', llmProvider: 'openai' };
    llmVault.set('scan1', { provider: 'openai', apiKey: 'sk-bad-123456', model: 'gpt-test' });
    const fetchImpl = vi.fn(
      async () => new Response('{"error":"bad key sk-bad-123456"}', { status: 401 }),
    );
    await processScan('scan1', deps({ fetchImpl }));
    expect(body().insights).toMatchObject({
      engine: 'rules',
      provider: 'openai',
      fallbackReason: 'The provider rejected the API key.',
    });
    expect(JSON.stringify(body())).not.toContain('sk-bad');
    expect(updates.at(-1)).toMatchObject({ status: 'done' });
  });

  it('notes when the key expired before the audit ran', async () => {
    scanDoc = { ...scanDoc, insightsEngine: 'llm', llmProvider: 'anthropic' };
    await processScan('scan1', deps());
    expect(body().insights).toMatchObject({
      engine: 'rules',
      fallbackReason: 'The API key expired before the audit ran.',
    });
  });
});

describe('friendlyError', () => {
  it.each([
    ['HTTP 403', 'The site blocked the scan.'],
    ['Navigation timeout of 20000 ms exceeded', 'The site took too long to respond.'],
    ['net::ERR_CONNECTION_REFUSED', 'Could not connect to the site.'],
    ['HTTP 500', 'The site responded with an error (HTTP 500).'],
    ['weird', 'The audit failed unexpectedly. Please try again.'],
  ])('%s', (input, expected) => expect(friendlyError(new Error(input))).toBe(expected));
});
