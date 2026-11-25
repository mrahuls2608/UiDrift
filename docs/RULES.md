# UIDrift — Project Rules

Rules for anyone (human or AI assistant) writing code in this repo.

## 1. General
- Keep it **free**: never add a paid service, paid API or anything that needs a credit card.
- Keep it **simple**: no new library unless it removes real complexity.
- Every feature must map to a requirement in `PRD.md`.
- Follow `PHASES.md` order; don't start a phase before the previous one works.

## 2. Code Style
- Language: **TypeScript** on frontend and backend (`strict: true`).
- Formatting: Prettier (2 spaces, single quotes, semicolons, 100 char width).
- Linting: ESLint must pass with zero errors before commit.
- Naming:
  - Files: `kebab-case.ts`; React components: `PascalCase.tsx`
  - Variables/functions: `camelCase`; constants: `UPPER_SNAKE_CASE`
  - Mongo collections: plural lowercase (`scans`, `users`)
- Functions do one thing; keep them under ~40 lines.
- No `any`. Use shared types from `@uidrift/shared` (`shared/src`).
- No commented-out code in commits.

## 3. Frontend Rules
- Use only design tokens from `DESIGN.md` — **no hard-coded colors, sizes or spacing**. The Tailwind scales are replaced by tokens, so a class outside the scale (e.g. `h-40`) silently generates nothing: use a token or an explicit arbitrary value.
- Build UI only from components in `src/components/ui`. New pattern → new reusable component.
- Every interactive element must be keyboard accessible with a visible focus state.
- Every image/icon that carries meaning needs alt text or `aria-label`.
- Data fetching through React Query; no fetch calls inside components directly.
- Show loading, empty and error states for every data view.
- Lazy-load report sections and heavy charts.

## 4. Backend Rules
- Layering: `routes → controllers → services → models`. No DB calls in routes.
- Validate every request body/params with **Zod**.
- Return errors as `{ error: { code, message } }` with correct HTTP status.
- Never trust user URLs:
  - Allow only `http`/`https`
  - Block localhost, private IP ranges (10.x, 172.16–31.x, 192.168.x, 127.x, 169.254.x) and `file://`
  - Resolve DNS and re-check the IP before crawling
- Rate limit scan creation: 5 per hour per IP.
- Secrets only in `.env`; never commit `.env`. Keep `.env.example` updated.
- **LLM keys are user input only.** Never read them from environment variables or config. Hold them encrypted in Redis with a short TTL, read once (`GETDEL`), never write them to MongoDB, logs, errors or API responses.
- **Scores, groups and tokens must never depend on an LLM.** LLM output may only rewrite insights, and must fall back to rule-based insights on any failure.
- **Login-only:** every route except `/health` and `/auth/*` sits behind `requireAuth`; reports are visible to their owner (and demo reports to signed-in users).

## 5. Puppeteer / Crawler Rules (memory safety for free tier)
- **One scan at a time** (BullMQ worker, concurrency 1).
- Max **10 pages** per scan; **20 s** timeout per page; **90 s** per scan.
- Block images, fonts and media requests to save memory.
- Always close pages and the browser in a `finally` block.
- Respect `robots.txt`; use a clear user agent: `UIDriftBot/1.0`.
- Never store page HTML; store only extracted style data.

## 6. Database Rules
- Mongoose schemas with explicit types and indexes.
- Keep documents under 1 MB; store large element lists in a separate `elements` collection if needed.
- Delete anonymous scans older than 30 days (TTL index) to stay within the 512 MB free limit.

## 7. Testing
- Backend: Vitest + Supertest for every route; unit tests for fingerprinting, grouping and scoring.
- Frontend: Vitest + React Testing Library for components; at least one test per UI component.
- Accessibility: run axe in component tests.
- Minimum coverage: 70% on `services/analysis`.

## 8. Git
- Branches: `main` (deployable), `feat/*`, `fix/*`, `chore/*`.
- Commit messages: Conventional Commits — `feat: add color grouping`, `fix: close browser on timeout`.
- Small PRs; each one passes lint + tests.

## 9. Definition of Done
A task is done when:
1. It meets its requirement in `PRD.md`
2. Lint and tests pass
3. Loading, error and empty states exist
4. It works on mobile and with keyboard only
5. Docs (`README.md`/`TRD.md`) are updated if behavior changed
