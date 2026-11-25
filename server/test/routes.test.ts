import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/lib/errors.js';

vi.mock('../src/services/scan.service.js', () => ({
  createScan: vi.fn(),
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
const app = createApp();
const scanDto = { id: ID, url: 'https://example.com/', status: 'queued' };

beforeEach(() => vi.clearAllMocks());

describe('health', () => {
  it('reports db and redis status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: true, redis: true });
  });
});

describe('POST /scans', () => {
  it('validates the body', async () => {
    const res = await request(app).post('/api/v1/scans').send({ url: 'not a url at all' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_URL');
  });

  it('adds https:// and creates a scan', async () => {
    vi.mocked(scans.createScan).mockResolvedValue(scanDto as never);
    const res = await request(app).post('/api/v1/scans').send({ url: 'example.com', maxPages: 3 });
    expect(res.status).toBe(202);
    expect(res.body.scanId).toBe(ID);
    expect(scans.createScan).toHaveBeenCalledWith(
      { url: 'https://example.com', maxPages: 3 },
      undefined,
    );
  });

  it('rejects maxPages above 10', async () => {
    const res = await request(app)
      .post('/api/v1/scans')
      .send({ url: 'https://example.com', maxPages: 50 });
    expect(res.status).toBe(400);
  });

  it('returns service errors in the standard format', async () => {
    vi.mocked(scans.createScan).mockRejectedValue(
      new AppError(400, 'INVALID_URL', 'Only public http/https URLs are allowed.'),
    );
    const res = await request(app).post('/api/v1/scans').send({ url: 'http://10.0.0.1' });
    expect(res.body).toEqual({
      error: { code: 'INVALID_URL', message: 'Only public http/https URLs are allowed.' },
    });
  });

  it('blocks cross-site origins (CSRF)', async () => {
    const res = await request(app)
      .post('/api/v1/scans')
      .set('Origin', 'https://evil.test')
      .send({ url: 'https://a.com' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });

  it('rate limits to 5 scans per hour per IP', async () => {
    vi.mocked(scans.createScan).mockResolvedValue(scanDto as never);
    const ip = '203.0.113.50';
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (
          await request(app)
            .post('/api/v1/scans')
            .set('X-Forwarded-For', ip)
            .send({ url: 'https://a.com' })
        ).status,
      );
    }
    expect(statuses.slice(0, 5).every((s) => s === 202)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('scans and reports', () => {
  it('rejects malformed ids', async () => {
    const res = await request(app).get('/api/v1/scans/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('returns a scan', async () => {
    vi.mocked(scans.getScan).mockResolvedValue(scanDto as never);
    const res = await request(app).get(`/api/v1/scans/${ID}`);
    expect(res.body.scan.id).toBe(ID);
  });

  it('returns 409 while a report is not ready', async () => {
    vi.mocked(reports.getReport).mockRejectedValue(
      new AppError(409, 'REPORT_NOT_READY', 'not ready'),
    );
    const res = await request(app).get(`/api/v1/reports/${ID}`);
    expect(res.status).toBe(409);
  });

  it('exports files as attachments and validates the format', async () => {
    vi.mocked(reports.exportReport).mockResolvedValue({
      filename: 'tokens.css',
      contentType: 'text/css',
      body: ':root{}',
    });
    const ok = await request(app).get(`/api/v1/reports/${ID}/export?format=css`);
    expect(ok.status).toBe(200);
    expect(ok.headers['content-disposition']).toContain('tokens.css');
    expect(ok.text).toBe(':root{}');
    const bad = await request(app).get(`/api/v1/reports/${ID}/export?format=exe`);
    expect(bad.status).toBe(400);
  });

  it('lists demos', async () => {
    vi.mocked(scans.listDemos).mockResolvedValue([]);
    expect((await request(app).get('/api/v1/demos')).body).toEqual({ demos: [] });
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
      isPublic: true,
      createdAt: new Date(),
    } as never);
    const res = await request(app).get(`/api/v1/scans/${ID}/events`);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toContain('no-transform');
    expect(res.text).toContain('event: snapshot');
  });
});

describe('auth', () => {
  it('requires auth for /me/scans', async () => {
    const res = await request(app).get('/api/v1/me/scans');
    expect(res.status).toBe(401);
  });

  it('signs up and sets an httpOnly cookie that authenticates later requests', async () => {
    vi.mocked(auth.signup).mockResolvedValue({ id: ID, email: 'a@b.co' });
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'A@b.co', password: 'longenough' });
    expect(res.status).toBe(201);
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/uidrift_token=.+HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(auth.signup).toHaveBeenCalledWith({ email: 'a@b.co', password: 'longenough' });

    vi.mocked(scans.listUserScans).mockResolvedValue([]);
    const mine = await request(app)
      .get('/api/v1/me/scans')
      .set('Cookie', cookie.split(';')[0] as string);
    expect(mine.status).toBe(200);
    expect(scans.listUserScans).toHaveBeenCalledWith(ID);
  });

  it('ignores forged tokens', async () => {
    const res = await request(app)
      .get('/api/v1/me/scans')
      .set('Cookie', 'uidrift_token=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.');
    expect(res.status).toBe(401);
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
