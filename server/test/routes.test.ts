import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/lib/errors.js';

vi.mock('../src/services/scan.service.js', () => ({
  createScan: vi.fn(),
  createSourceScan: vi.fn(),
  getScan: vi.fn(),
  getScanDoc: vi.fn(),
  cancelOrDeleteScan: vi.fn(),
  listUserScans: vi.fn(),
  listDemos: vi.fn(),
}));
vi.mock('../src/services/report.service.js', () => ({ getReport: vi.fn(), exportReport: vi.fn() }));
vi.mock('../src/services/auth.service.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/auth.service.js')>()),
  signup: vi.fn(),
  login: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock('../src/queue/events.js', () => ({
  TERMINAL_EVENTS: ['done', 'failed', 'cancelled'],
  recentScanEvents: vi.fn(async () => []),
  scanEventBus: { subscribe: vi.fn(() => () => undefined) },
}));
vi.mock('../src/lib/db.js', () => ({ isDbReady: () => true }));
vi.mock('../src/lib/redis.js', () => ({ redis: () => ({ ping: async () => 'PONG' }) }));

const scans = await import('../src/services/scan.service.js');
const reports = await import('../src/services/report.service.js');
const auth = await import('../src/services/auth.service.js');
const { createApp } = await import('../src/app.js');

const ID = '64b7f0c2a1b2c3d4e5f60718';
const USER = '64b7f0c2a1b2c3d4e5f60719';
const app = createApp();
const scanDto = { id: ID, url: 'https://example.com/', status: 'queued' };
// The scan rate limit is per account, so each request gets its own user unless a test needs one.
let counter = 0;
const freshUser = () => `64b7f0c2a1b2c3d4e5${(0x100000 + counter++).toString(16)}`;
const as = <T extends request.Test>(req: T, user = freshUser()) =>
  req.set('Cookie', `uidrift_token=${auth.signToken(user)}`);

beforeEach(() => vi.clearAllMocks());

describe('health', () => {
  it('is public and reports db and redis status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: true, redis: true });
  });
});

describe('login is required for everything except health and auth', () => {
  it.each([
    ['post', '/api/v1/scans'],
    ['post', '/api/v1/scans/source'],
    ['get', `/api/v1/scans/${ID}`],
    ['get', `/api/v1/scans/${ID}/events`],
    ['delete', `/api/v1/scans/${ID}`],
    ['get', `/api/v1/reports/${ID}`],
    ['get', `/api/v1/reports/${ID}/export?format=css`],
    ['get', '/api/v1/demos'],
    ['get', '/api/v1/me/scans'],
  ] as const)('%s %s → 401 when signed out', async (method, path) => {
    const res = await request(app)[method](path).send({ url: 'https://a.com' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a large source upload before reading it when signed out', async () => {
    const res = await request(app)
      .post('/api/v1/scans/source')
      .set('Content-Type', 'application/json')
      .send(
        JSON.stringify({
          source: {
            type: 'files',
            label: 'x',
            files: [{ path: 'a.css', content: 'a'.repeat(200_000) }],
          },
        }),
      );
    expect(res.status).toBe(401);
  });

  it('ignores forged tokens', async () => {
    const res = await request(app)
      .get('/api/v1/me/scans')
      .set('Cookie', 'uidrift_token=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.');
    expect(res.status).toBe(401);
  });
});

describe('POST /scans (website audit)', () => {
  it('validates the body', async () => {
    const res = await as(request(app).post('/api/v1/scans')).send({ url: 'not a url at all' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_URL');
  });

  it('adds https:// and creates the audit for the signed-in user', async () => {
    vi.mocked(scans.createScan).mockResolvedValue(scanDto as never);
    const res = await as(request(app).post('/api/v1/scans'), USER).send({
      url: 'example.com',
      maxPages: 3,
    });
    expect(res.status).toBe(202);
    expect(res.body.scanId).toBe(ID);
    expect(scans.createScan).toHaveBeenCalledWith(
      { url: 'https://example.com', maxPages: 3 },
      USER,
    );
  });

  it('accepts an optional LLM key from the request and validates it', async () => {
    vi.mocked(scans.createScan).mockResolvedValue(scanDto as never);
    const llm = { provider: 'anthropic', apiKey: 'sk-ant-test-123456' };
    await as(request(app).post('/api/v1/scans'), USER).send({ url: 'https://a.com', llm });
    expect(scans.createScan).toHaveBeenCalledWith(expect.objectContaining({ llm }), USER);
    const bad = await as(request(app).post('/api/v1/scans')).send({
      url: 'https://a.com',
      llm: { provider: 'openai', apiKey: 'sk-test-123456' },
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('Enter a model name');
  });

  it('rejects maxPages above 10', async () => {
    const res = await as(request(app).post('/api/v1/scans')).send({
      url: 'https://example.com',
      maxPages: 50,
    });
    expect(res.status).toBe(400);
  });

  it('returns service errors in the standard format', async () => {
    vi.mocked(scans.createScan).mockRejectedValue(
      new AppError(400, 'INVALID_URL', 'Only public http/https URLs are allowed.'),
    );
    const res = await as(request(app).post('/api/v1/scans')).send({ url: 'http://10.0.0.1' });
    expect(res.body).toEqual({
      error: { code: 'INVALID_URL', message: 'Only public http/https URLs are allowed.' },
    });
  });

  it('blocks cross-site origins (CSRF)', async () => {
    const res = await as(request(app).post('/api/v1/scans'))
      .set('Origin', 'https://evil.test')
      .send({ url: 'https://a.com' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });

  it('rate limits to 5 audits per hour per account', async () => {
    vi.mocked(scans.createScan).mockResolvedValue(scanDto as never);
    const statuses: number[] = [];
    const user = freshUser();
    for (let i = 0; i < 6; i++)
      statuses.push(
        (await as(request(app).post('/api/v1/scans'), user).send({ url: 'https://a.com' })).status,
      );
    expect(statuses.slice(0, 5).every((s) => s === 202)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('POST /scans/source (source-code audit)', () => {
  const freshApp = app;

  it('accepts files and GitHub repositories', async () => {
    vi.mocked(scans.createSourceScan).mockResolvedValue({ ...scanDto, kind: 'source' } as never);
    const files = {
      source: {
        type: 'files',
        label: 'app.zip',
        files: [{ path: 'a.css', content: '.btn{color:red}' }],
      },
    };
    expect((await as(request(freshApp).post('/api/v1/scans/source')).send(files)).status).toBe(202);
    const repo = { source: { type: 'github', repo: 'https://github.com/acme/ui' } };
    expect((await as(request(freshApp).post('/api/v1/scans/source'), USER).send(repo)).status).toBe(
      202,
    );
    expect(scans.createSourceScan).toHaveBeenLastCalledWith(repo, USER);
  });

  it('accepts uploads larger than the default 10 kb body limit', async () => {
    vi.mocked(scans.createSourceScan).mockResolvedValue({ ...scanDto, kind: 'source' } as never);
    const big = {
      source: {
        type: 'files',
        label: 'big',
        files: [{ path: 'a.css', content: `.a{color:red}${' '.repeat(300_000)}` }],
      },
    };
    expect((await as(request(freshApp).post('/api/v1/scans/source')).send(big)).status).toBe(202);
  });

  it('rejects non-GitHub repositories and empty file lists', async () => {
    const gitlab = await as(request(freshApp).post('/api/v1/scans/source')).send({
      source: { type: 'github', repo: 'https://gitlab.com/a/b' },
    });
    expect(gitlab.status).toBe(400);
    const empty = await as(request(freshApp).post('/api/v1/scans/source')).send({
      source: { type: 'files', label: 'x', files: [] },
    });
    expect(empty.status).toBe(400);
  });
});

describe('scans and reports', () => {
  it('rejects malformed ids', async () => {
    const res = await as(request(app).get('/api/v1/scans/abc'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('returns a scan for its owner', async () => {
    vi.mocked(scans.getScan).mockResolvedValue(scanDto as never);
    const res = await as(request(app).get(`/api/v1/scans/${ID}`), USER);
    expect(res.body.scan.id).toBe(ID);
    expect(scans.getScan).toHaveBeenCalledWith(ID, USER);
  });

  it('returns 409 while a report is not ready', async () => {
    vi.mocked(reports.getReport).mockRejectedValue(
      new AppError(409, 'REPORT_NOT_READY', 'not ready'),
    );
    expect((await as(request(app).get(`/api/v1/reports/${ID}`))).status).toBe(409);
  });

  it('exports files as attachments and validates the format', async () => {
    vi.mocked(reports.exportReport).mockResolvedValue({
      filename: 'tokens.css',
      contentType: 'text/css',
      body: ':root{}',
    });
    const ok = await as(request(app).get(`/api/v1/reports/${ID}/export?format=css`));
    expect(ok.status).toBe(200);
    expect(ok.headers['content-disposition']).toContain('tokens.css');
    expect(ok.text).toBe(':root{}');
    expect((await as(request(app).get(`/api/v1/reports/${ID}/export?format=exe`))).status).toBe(
      400,
    );
  });

  it('lists demos for signed-in users', async () => {
    vi.mocked(scans.listDemos).mockResolvedValue([]);
    expect((await as(request(app).get('/api/v1/demos'))).body).toEqual({ demos: [] });
  });
});

describe('GET /scans/:id/events', () => {
  it('streams SSE with no-transform so proxies (Next.js rewrites) do not gzip-buffer it', async () => {
    vi.mocked(scans.getScanDoc).mockResolvedValue({
      _id: ID,
      url: 'https://a.com/',
      domain: 'a.com',
      status: 'done',
      progress: {},
      pagesScanned: [],
      isDemo: false,
      isPublic: false,
      createdAt: new Date(),
    } as never);
    const res = await as(request(app).get(`/api/v1/scans/${ID}/events`));
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toContain('no-transform');
    expect(res.text).toContain('event: snapshot');
  });
});

describe('auth', () => {
  it('signs up and sets an httpOnly cookie that authenticates later requests', async () => {
    vi.mocked(auth.signup).mockResolvedValue({ id: ID, email: 'a@b.co' });
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'A@b.co', password: 'longenough', name: 'Ada' });
    expect(res.status).toBe(201);
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/uidrift_token=.+HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(auth.signup).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'longenough',
      name: 'Ada',
    });

    vi.mocked(scans.listUserScans).mockResolvedValue([]);
    const mine = await request(app)
      .get('/api/v1/me/scans')
      .set('Cookie', cookie.split(';')[0] as string);
    expect(mine.status).toBe(200);
    expect(scans.listUserScans).toHaveBeenCalledWith(ID);
  });

  it('validates credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nope', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects oversized bodies', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a'.repeat(20_000) }));
    expect(res.status).toBe(413);
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
