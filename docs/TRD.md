# UIDrift — Technical Requirements Document (TRD)

## 1. Architecture

```
┌──────────────────────┐   /api/v1 rewrite proxy   ┌──────────────────────────┐
│  Next.js (App Router)│ ───────────────────────▶ │  Express API (Node + TS) │
│  Vercel (free)       │ ◀─────── SSE progress ── │  Render free web service │
└──────────────────────┘                           │                          │
                                                   │  ┌────────────────────┐  │
                                                   │  │ BullMQ queue (Redis)│ │
                                                   │  └─────────┬──────────┘  │
                                                   │            ▼             │
                                                   │  ┌────────────────────┐  │
                                                   │  │ Crawler (Puppeteer)│  │
                                                   │  │ + axe-core         │  │
                                                   │  └─────────┬──────────┘  │
                                                   │            ▼             │
                                                   │  ┌────────────────────┐  │
                                                   │  │ Analysis Engine    │  │
                                                   │  │ fingerprint/group/ │  │
                                                   │  │ score/tokens/codegen│ │
                                                   │  └─────────┬──────────┘  │
                                                   └────────────┼─────────────┘
                                                                ▼
                              ┌──────────────────────────┐   ┌──────────────────────────┐
                              │ MongoDB Atlas M0 (free)  │   │ Redis (Upstash / Render) │
                              │ users · scans · reports  │   │ queue · pub/sub · cache  │
                              └──────────────────────────┘   │ rate limits · cancel flag│
                                                             └──────────────────────────┘

### Why Redis
| Use | Detail |
|---|---|
| Job queue | BullMQ queue `uidrift-scans`, worker concurrency 1. The worker runs inline in the API (free tier) or as a separate process (`server/dist/worker.js`). |
| Live progress | The worker publishes events on `uidrift:scan-events:<id>`; each API process holds one pattern subscription and fans out to SSE clients. The last 20 events are kept in a list so late joiners catch up. |
| Cancellation | `uidrift:scan-cancel:<id>` flag checked by the crawler between pages. |
| Rate limiting | `express-rate-limit` with `rate-limit-redis`, shared across instances. |
| Report cache | Reports are immutable, so they are cached as JSON for 1 h after the first read. |
```

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript | Routing, SSR shell, API proxy for first-party cookies |
| Styling | Tailwind CSS mapped to design tokens | Enforces tokens |
| Data fetching | TanStack React Query | Caching, loading states |
| Charts | Recharts | Free, simple |
| Backend | Node 20+, Express, TypeScript | MERN requirement |
| Queue / cache | Redis + BullMQ + ioredis | Durable queue, pub/sub for SSE, shared rate limits |
| Validation | Zod | Shared schemas |
| Crawler | Puppeteer | Free headless Chrome |
| Accessibility | axe-core (`@axe-core/puppeteer`) | Free a11y engine |
| Colors | `culori` | Delta-E color distance |
| DB | MongoDB Atlas M0 + Mongoose | Free 512 MB |
| Auth | JWT (httpOnly cookie) + bcrypt | Simple |
| Export | JSZip | ZIP download in browser |
| Testing | Vitest, Supertest, React Testing Library, jest-axe | Jest-compatible API with native ESM + TS |
| CI | GitHub Actions (free) | Lint + test on PR |

## 3. Folder Structure

```
uidrift/
├── web/                          # Next.js app
│   └── src/
│       ├── app/                  # routes: /, /scan/[id], /report/[id], /dashboard, /login, /signup
│       ├── components/ui/        # reusable components
│       ├── features/             # scan, report, dashboard, auth
│       ├── hooks/                # React Query hooks, SSE hook
│       └── lib/                  # api client, utils (tokens live in app/globals.css)
├── server/
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       │   ├── crawler/          # puppeteer, robots, url-guard
│       │   ├── analysis/         # fingerprint, group, score
│       │   └── generator/        # tokens, react components
│       ├── queue/                # BullMQ queue + Redis event bus
│       ├── models/
│       ├── middleware/
│       ├── index.ts              # API (+ inline worker)
│       └── worker.ts             # standalone worker
├── shared/src                # types, zod schemas, constants (built to dist)
└── docs/ (PRD, DESIGN, RULES, TRD, PHASES)
```

## 4. Data Models

### User
```ts
{ _id, email: string (unique), passwordHash: string, createdAt }
```

### Scan
```ts
{
  _id,
  userId?: ObjectId,
  url: string,
  domain: string,
  status: 'queued' | 'crawling' | 'analysing' | 'done' | 'failed',
  progress: { pagesDone: number, pagesTotal: number, step: string },
  pagesScanned: string[],
  isDemo: boolean,
  isPublic: boolean,
  error?: string,
  createdAt, completedAt
}
// TTL index: anonymous, non-demo scans expire after 30 days
```

### Report
```ts
{
  _id, scanId,
  score: { overall: number, components: number, colors: number,
           typography: number, spacing: number, radius: number },
  componentGroups: [{
    type: 'button' | 'input' | 'heading' | 'link' | 'card',
    fingerprint: string,
    styles: Record<string, string>,
    count: number,
    pages: string[],
    sampleText: string
  }],
  colors: [{ hex: string, merged: string[], count: number }],
  fontSizes: [{ value: string, count: number }],
  fontFamilies: [{ value: string, count: number }],
  spacing: [{ value: string, count: number }],
  radius: [{ value: string, count: number }],
  a11y: [{ id: string, impact: string, description: string,
           page: string, selector: string, help: string }],
  tokens: { css: string, json: object }
}
```

## 5. API

Base URL: `/api/v1`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/scans` | optional | Start scan `{ url, maxPages }` → `{ scanId }` |
| GET | `/scans/:id` | — | Scan status |
| GET | `/scans/:id/events` | — | Server-Sent Events progress stream |
| DELETE | `/scans/:id` | owner | Cancel / delete |
| GET | `/reports/:scanId` | — | Full report |
| GET | `/reports/:scanId/export?format=css\|json\|react` | — | Export file |
| GET | `/demos` | — | List demo reports |
| GET | `/me` | optional | Current user or `null` |
| GET | `/me/scans` | required | User's scans |
| POST | `/auth/signup` | — | Create account |
| POST | `/auth/login` | — | Login |
| POST | `/auth/logout` | required | Logout |
| GET | `/health` | — | Health check (used by frontend to wake server) |

Error format:
```json
{ "error": { "code": "INVALID_URL", "message": "Only public http/https URLs are allowed." } }
```

## 6. Scan Pipeline

1. **Validate URL** — Zod schema → protocol check → DNS lookup → block private IPs.
2. **Queue** — add a BullMQ job (jobId = scanId); worker concurrency = 1.
3. **Launch browser** — `puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--single-process'] })`.
4. **Block heavy resources** — request interception aborts `image`, `media`, `font`.
5. **Crawl** — BFS over same-domain links, skip by `robots.txt`, max 10 pages, 20 s each.
6. **Extract** — `page.evaluate()` collects target elements and `getComputedStyle` values (visible elements only, max 300 per page).
7. **Accessibility** — run axe-core, keep `serious` and `critical` violations + top `moderate`.
8. **Close page**, emit SSE progress.
9. **Analyse** (after crawl, browser closed):
   - Fingerprint
   - Group
   - Merge colors
   - Score
   - Generate tokens + React components
10. **Save** report, mark scan `done`.

## 7. Analysis Algorithms

### Fingerprint
Normalize and join key properties:
```
button → bg|color|fontSize|fontWeight|paddingY|paddingX|radius|border|shadow
```
Normalization: colors → hex, px values rounded to nearest 2 px.

### Grouping
1. Exact fingerprint match → same group.
2. Merge groups where all numeric diffs ≤ 2 px and color Delta-E < 3.
3. Sort groups by count; top N (ideal count) = suggested standards.

### Color merging
Collect all text, background and border colors → cluster with Delta-E (CIEDE2000) < 3 → representative = most used hex.

### Token generation
- Colors → top 12 groups named `--color-1..12` (plus `primary` = most used button background)
- Font sizes → top 8 sorted ascending → `--font-size-xs..3xl`
- Spacing → top 8 → `--space-1..8`
- Radius → top 4 → `--radius-sm..xl`

### Code generation
Templates produce `Button.tsx`, `Input.tsx`, `Card.tsx`, `Heading.tsx` with variants from the top groups and tokens.

## 8. Real-time Progress
Server-Sent Events (`text/event-stream`), events:
```
queued · page_started · page_done · analysing · done · failed
```
Frontend falls back to polling `/scans/:id` every 3 s if SSE fails.

## 9. Security
- SSRF guard (see RULES.md)
- `helmet`, CORS limited to frontend domain
- `express-rate-limit`: 5 scans/hour/IP, 100 requests/15 min general
- bcrypt (10 rounds), JWT 7-day expiry in httpOnly, secure, SameSite=Lax cookie (first-party via the Next.js proxy)
- Origin check on state-changing requests (CSRF), 10 kb JSON body limit
- Every browser request during a crawl is re-checked against the SSRF guard (DNS-rebinding defence)
- Captured styles rendered in previews via inline style objects only (never raw HTML)

## 10. Performance & Free-Tier Limits

| Limit | Value |
|---|---|
| Concurrent scans | 1 |
| Pages per scan | 10 |
| Elements per page | 300 |
| Page timeout | 20 s |
| Scan timeout | 90 s |
| Report doc size | < 1 MB |
| Anonymous scan retention | 30 days |

## 11. Environment Variables

```
# server/.env
PORT=4000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=https://uidrift.vercel.app
MAX_PAGES=10
NODE_ENV=production
REDIS_URL=rediss://...
RUN_WORKER_INLINE=true
CHROME_PATH=            # optional system Chrome
SCAN_RATE_LIMIT_PER_HOUR=5

# web/.env
API_URL=https://uidrift-api.onrender.com     # Next.js proxies /api/v1/* here
NEXT_PUBLIC_SSE_URL=                          # optional direct SSE base
```

## 12. Deployment (all free)
- **Frontend:** Vercel, root directory `web/` (npm workspaces are detected), framework Next.js, env `API_URL`
- **Backend:** Render free web service (see `render.yaml`), build `npm ci && npm run build -w server`, start `node server/dist/index.js`. Use Puppeteer's bundled Chrome; set `PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer`.
- **Redis:** Upstash free tier or Render Key Value (free)
- **DB:** MongoDB Atlas M0, allow access from `0.0.0.0/0` with strong user password
- **CI:** GitHub Actions runs lint + tests on every PR
- **No credit card** added anywhere
