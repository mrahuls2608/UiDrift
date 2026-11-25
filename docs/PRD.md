# UIDrift — Product Requirements Document (PRD)

**Version:** 1.0
**Owner:** Anuradha
**Stack:** MERN (MongoDB, Express, React, Node.js) + Puppeteer
**Budget:** ₹0 (free tiers only)

---

## 1. Problem Statement

As products grow, different teams build UI separately. Over time a single website ends up with:

- 10–20 slightly different button styles
- Many near-identical shades of the same color
- Inconsistent font sizes, spacing and border radius
- Accessibility gaps (low contrast, missing labels)

This "UI drift" makes products look unpolished, slows development and makes design systems hard to adopt. Teams usually find it only through slow manual audits.

## 2. Solution

**UIDrift** automatically scans a website, extracts every UI component with its computed styles, groups near-duplicates, scores the site's consistency and generates design tokens plus starter React components from the most common patterns.

## 3. Goals

| Goal | Metric |
|---|---|
| Detect inconsistent components automatically | Scan of 10 pages finishes in < 90 s |
| Make drift easy to understand | Every report shows a 0–100 consistency score |
| Help fix the drift | Every report exports tokens (CSS + JSON) and React components |
| Track improvement | Re-scans show score change over time |
| Run free | ₹0 monthly hosting cost |

## 4. Non-Goals (v1)

- Scanning website pages behind login (source audits cover private code instead)
- Scanning mobile apps
- Visual screenshot diffing
- Paid plans, teams or billing
- Editing the scanned website directly

## 5. Target Users

1. **Frontend developers** who want to clean up a codebase's UI
2. **Designers** who want proof of inconsistency before building a design system
3. **Engineering managers** who want a measurable UI-quality number

## 6. User Stories

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| US-1 | Visitor | enter a URL and start a scan | I can audit any public site |
| US-2 | Visitor | see live scan progress | I know it is working |
| US-3 | Visitor | see a consistency score and summary | I understand the result at a glance |
| US-4 | Visitor | see grouped component variants (buttons, inputs, cards, headings, links) | I can see exactly where drift exists |
| US-5 | Visitor | see color, font size, spacing and border radius sprawl | I can spot token-level problems |
| US-6 | Visitor | see accessibility issues | I can fix contrast and label problems |
| US-7 | Visitor | export design tokens (CSS variables + JSON) | I can start a design system |
| US-8 | Visitor | export starter React components | I can replace drifted components |
| US-9 | Registered user | save scans and re-scan later | I can track improvement over time |
| US-10 | Registered user | open pre-scanned demo reports | I can see value instantly without waiting |
| US-11 | Registered user | audit my project's source code (ZIP, folder, GitHub repo or pasted files) | I can find drift before it ships, without a deployed site |
| US-12 | Registered user | get prioritized recommendations without any AI service | I get a useful, private, free result |
| US-13 | Registered user | optionally use my own LLM key for an audit | I get better-written insights, with the same scores |
| US-14 | Developer | run the source audit from the command line | I can use it locally or in CI without the web app |

## 7. Functional Requirements

### 7.1 Scanning
- FR-1: Accept a public `http/https` URL; reject private IPs and localhost.
- FR-2: Crawl the start page plus same-domain links, up to **10 pages** (configurable 1–10).
- FR-3: Respect `robots.txt`.
- FR-4: Extract elements: `button`, `a`, `input`, `select`, `textarea`, `h1–h6`, card-like containers.
- FR-5: Capture computed styles: color, background, font family/size/weight, padding, margin, border, border radius, box shadow, width/height.
- FR-6: Run axe-core accessibility checks on each page.
- FR-7: Only one scan runs at a time; extra scans wait in a queue.

### 7.2 Analysis
- FR-8: Create a style fingerprint per element.
- FR-9: Group elements whose fingerprints are similar (within a tolerance).
- FR-10: Merge near-identical colors (Delta-E < 3) into one color group.
- FR-11: Calculate a consistency score (0–100) per category and overall.
- FR-12: Suggest an ideal number of variants per component type.

### 7.3 Output
- FR-13: Report page with score, summary cards, component groups, token sprawl and accessibility list.
- FR-14: Export tokens as `tokens.css` and `tokens.json`.
- FR-15: Export starter React components (Button, Input, Card, Heading) using the tokens.
- FR-16: Shareable public report link.

### 7.4 Accounts (required)
- FR-17: Email + password sign-up with JWT. **Every audit, report, export and history view requires login**; only the landing page is public.
- FR-18: Dashboard listing a user's saved audits and score history chart.
- FR-19: Seeded demo users and demo reports for local and production demos (`npm run seed`).

### 7.5 Source-code audits
- FR-20: Accept source as a ZIP or folder (read in the browser, only style/markup files uploaded), a public GitHub repository, or pasted files.
- FR-21: Statically extract styles from CSS, SCSS/Sass, LESS, CSS custom properties, Tailwind classes, CSS-in-JS, React inline styles and Vue/Svelte/HTML style blocks, with `file:line` locations.
- FR-22: Run static accessibility checks (alt text, labels, button/link names, tabindex, lang, contrast, focus outlines).
- FR-23: Produce the same report, score and exports as a website audit.

### 7.6 Insights (AI optional)
- FR-24: Every report includes deterministic, rule-based recommendations and token names.
- FR-25: The user may supply an LLM (Anthropic, OpenAI or OpenAI-compatible) **per audit, in the UI or CLI — never from server environment variables**. The LLM only rewrites insights; scores, groups and tokens never depend on it. Failures fall back to rule-based insights.
- FR-26: A CLI runs the source audit offline (`npm run analyze -- <folder>`).

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Report page loads in < 2 s; Lighthouse ≥ 90 |
| Accessibility | WCAG 2.1 AA for UIDrift's own UI |
| Security | SSRF protection, rate limiting (5 scans/hour/IP), input validation |
| Reliability | Scan timeout 90 s; failed scans show a clear reason |
| Cost | Runs fully on free tiers |
| Browser support | Latest Chrome, Edge, Firefox, Safari |

## 9. Consistency Score Formula

For each category (buttons, inputs, colors, font sizes, spacing, radius):

```
categoryScore = 100 × (idealVariants / max(actualVariants, idealVariants))
```

Ideal variants: buttons 3, inputs 2, headings 6, colors 12, font sizes 8, spacing 8, radius 4.

```
overallScore = weighted average
  components 40% · colors 20% · typography 20% · spacing 10% · radius 10%
```

Accessibility violations are reported separately and lower the overall score by up to 10 points.

## 10. Success Criteria

- Scans at least 5 well-known public websites successfully
- Generates tokens that compile and components that render
- Live demo with 3–4 saved demo reports
- 1–2 minute demo video and complete README

## 11. Risks

| Risk | Mitigation |
|---|---|
| Free server runs out of memory | 10-page cap, one scan at a time, close browser after each scan |
| Server sleeps (cold start) | Pre-scanned demo reports + "Waking up server…" loader |
| Sites block headless browsers | Realistic user agent; show clear "site blocked scan" message |
| Heavy pages time out | 20 s per-page timeout, skip and continue |
