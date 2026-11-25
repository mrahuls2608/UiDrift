# UIDrift — Build Phases

Total: **~4 weeks** (about 2–3 hours on weekdays, more on weekends).
Finish each phase's checklist before moving to the next.

---

## Phase 0 — Setup (Day 1–2)
- [ ] Create GitHub repo `uidrift` with `client/`, `server/`, `shared/`, `docs/`
- [ ] Next.js + TS web app; Express + TS server; Redis
- [ ] ESLint, Prettier, Husky pre-commit hook
- [ ] MongoDB Atlas M0 cluster + connection
- [ ] `GET /api/v1/health` working
- [ ] GitHub Actions: lint + test on PR
- [ ] Add PRD, DESIGN, RULES, TRD, PHASES to `docs/`

**Done when:** client calls `/health` and shows "API online".

---

## Phase 1 — Crawler (Day 3–7)
- [ ] URL validation + SSRF guard (with tests)
- [ ] BullMQ queue on Redis (concurrency 1)
- [ ] Puppeteer launch with memory-safe flags; block images/fonts/media
- [ ] Same-domain BFS crawl, max 10 pages, robots.txt check
- [ ] Extract elements + computed styles
- [ ] Run axe-core per page
- [ ] Save raw results to `scans`
- [ ] `POST /scans`, `GET /scans/:id`

**Done when:** scanning 3 public sites returns element + style data without crashing.

---

## Phase 2 — Analysis Engine (Day 8–12)
- [ ] Style normalization (hex colors, rounded px)
- [ ] Fingerprinting per component type
- [ ] Grouping + near-duplicate merging
- [ ] Color clustering with Delta-E
- [ ] Font size, spacing, radius distributions
- [ ] Consistency score per category + overall
- [ ] Save `reports` document
- [ ] Unit tests (≥ 70% coverage on analysis)

**Done when:** a scan produces a report JSON with score and groups that look correct on manual check.

---

## Phase 3 — Frontend Core (Day 13–18)
- [ ] Token CSS + Tailwind config from DESIGN.md
- [ ] UI components: Button, Input, Card, Badge, Tabs, ScoreRing, StatCard, CodeBlock, ProgressSteps, EmptyState, Toast
- [ ] Landing page with URL input
- [ ] Scan progress page with SSE (+ polling fallback) and "Waking up server…" state
- [ ] Report page: Overview, Summary cards, Components tabs, Colors, Typography, Spacing & Radius, Accessibility
- [ ] Safe `ComponentPreview` rendering
- [ ] Loading, empty, error states everywhere

**Done when:** a user can paste a URL and see a full report end to end.

---

## Phase 4 — Export & Code Generation (Day 19–21)
- [ ] Generate `tokens.css` and `tokens.json`
- [ ] Generate React components (Button, Input, Card, Heading) from top groups
- [ ] Export tab with copy buttons + ZIP download (JSZip)
- [ ] Shareable public report link

**Done when:** exported components compile and render in a fresh Vite app.

---

## Phase 5 — Accounts & History (Day 22–24) *(optional but recommended)*
- [ ] Signup / login / logout with JWT cookie
- [ ] Save scans to user
- [ ] Dashboard table + score history chart
- [ ] Re-scan button

**Done when:** a logged-in user re-scans a site and sees the score change on a chart.

---

## Phase 6 — Polish, Test & Deploy (Day 25–28)
- [ ] Rate limiting, helmet, CORS
- [ ] Dark mode + reduced motion
- [ ] Keyboard and screen reader pass; axe on own UI = 0 serious issues
- [ ] Lighthouse ≥ 90 on landing and report
- [ ] Deploy client to Vercel, server to Render, DB on Atlas (no credit card)
- [ ] Scan and save 3–4 demo reports (`isDemo: true`)
- [ ] Record 1–2 min demo video
- [ ] Finish README with screenshots, GIF and live links
- [ ] Add project to resume + LinkedIn post with findings

**Done when:** live link works, demo reports load instantly, README is complete.

---

## Stretch Ideas (after launch)
- Chrome extension that runs UIDrift on the current tab
- Compare two scans side by side
- Figma tokens export format
- GitHub Action that fails a PR when the consistency score drops

---

## Phase 7 — Source audits, optional AI, login-only (done)
- [x] Login required for every audit, report, export and history view (API + Next.js proxy)
- [x] Deterministic source-code analyzer (CSS/SCSS/LESS, Tailwind, CSS-in-JS, JSX/HTML/Vue/Svelte) with static a11y checks
- [x] ZIP / folder / GitHub / paste input with size and safety limits
- [x] Rule-based insights for every report; optional user-supplied LLM (Anthropic, OpenAI, compatible) that never changes scores
- [x] CLI (`npm run analyze`), seed script with demo users, `scripts/run-demo.sh` for local, Docker and production demos
- [x] Landing page redesigned from the brand reference; demo video re-recorded
