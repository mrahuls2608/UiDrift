# UIDrift — Design Document

## 1. Design Principles

1. **Clarity first** — every screen answers one question.
2. **Show, don't tell** — show actual component previews, not just numbers.
3. **Practice what we preach** — UIDrift's own UI uses a strict, small token set.
4. **Accessible by default** — WCAG 2.1 AA, keyboard friendly, visible focus.

## 2. Design Tokens (UIDrift's own UI)

### Colors
| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#FFFFFF` | `#0B0F17` | Page background |
| `--color-surface` | `#F6F7F9` | `#141A24` | Cards |
| `--color-border` | `#E3E6EB` | `#232B38` | Borders, dividers |
| `--color-text` | `#111827` | `#E6E9EF` | Main text |
| `--color-text-muted` | `#5B6472` | `#9AA3B2` | Secondary text |
| `--color-primary` | `#4F46E5` | `#818CF8` | Buttons, links |
| `--color-on-primary` | `#FFFFFF` | `#0B0F17` | Text on primary (white on `#818CF8` fails 4.5:1) |
| `--color-success` | `#15803D` | `#4ADE80` | Good scores |
| `--color-warning` | `#B45309` | `#FBBF24` | Medium scores |
| `--color-danger` | `#B91C1C` | `#F87171` | Poor scores, a11y errors |

All text/background pairs must meet 4.5:1 contrast.

### Typography
- Font: **Inter** (UI), **JetBrains Mono** (code, tokens)
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 px
- Weights: 400, 500, 600, 700
- Line height: 1.5 body, 1.2 headings

### Spacing
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px

### Radius
`--radius-sm: 6px` · `--radius-md: 10px` · `--radius-lg: 16px` · `--radius-full: 9999px`

### Shadow
`--shadow-sm: 0 1px 2px rgba(0,0,0,.06)` · `--shadow-md: 0 4px 12px rgba(0,0,0,.08)`

## 3. Score Colors

| Score | Label | Color |
|---|---|---|
| 80–100 | Consistent | success |
| 50–79 | Drifting | warning |
| 0–49 | Chaotic | danger |

## 4. Screens

### 4.1 Landing page (`/`)
- Hero: headline "Find the UI drift hiding in your website", URL input + **Scan** button
- "Try a demo report" chips (3–4 pre-scanned sites)
- How it works: Crawl → Fingerprint → Group → Fix (4 steps)
- Sample report preview image
- Footer with GitHub link

### 4.2 Scan progress (`/scan/:id`)
- Progress bar with steps: Queued → Crawling (page x of y) → Extracting → Analysing → Done
- Live log list (latest 5 events)
- "Waking up server…" state when backend is cold
- Cancel button

### 4.3 Report (`/report/:id`)
Layout: left sticky sidebar navigation, main content on the right.

1. **Overview** — big score ring, label, site URL, pages scanned, date, Share + Export buttons
2. **Summary cards** — "14 button variants → suggest 3", "37 colors → suggest 12", etc.
3. **Components** — tabs: Buttons / Inputs / Headings / Links / Cards
   - Each group shows a live rendered preview, count, pages it appears on and its key styles
   - Groups sorted by usage (most used = suggested standard)
4. **Colors** — swatch grid, merged groups, usage count
5. **Typography** — font size bar chart, font families list
6. **Spacing & Radius** — value distribution charts
7. **Accessibility** — issue list with severity, element, page and fix hint
8. **Export** — tabs: `tokens.css` / `tokens.json` / React components; Copy + Download ZIP

### 4.4 Dashboard (`/dashboard`, logged in)
- Table of saved scans: site, score, date, Re-scan
- Line chart of score history per site

### 4.5 Auth (`/login`, `/signup`)
- Simple centered card form

## 5. Reusable Components

| Component | Variants / Props |
|---|---|
| `Button` | primary, secondary, ghost, danger · sm, md, lg · loading, disabled |
| `Input` | text, url, email, password · error, helper text |
| `Card` | default, interactive |
| `ScoreRing` | value, size |
| `StatCard` | title, value, suggestion |
| `Tabs` | keyboard arrow navigation |
| `Badge` | success, warning, danger, neutral |
| `ComponentPreview` | renders captured styles safely in a sandbox |
| `ColorSwatch` | hex, count |
| `CodeBlock` | language, copy button |
| `ProgressSteps` | steps, current |
| `EmptyState` | icon, title, action |
| `Toast` | success, error |

## 6. Interaction & Motion
- Transitions 150–200 ms, ease-out
- Score ring animates from 0 on first load
- Respect `prefers-reduced-motion`
- Skeleton loaders instead of spinners on report sections

## 7. Responsive Breakpoints
- Mobile < 640 px: sidebar becomes top tab bar
- Tablet 640–1024 px: single column
- Desktop > 1024 px: sidebar + content

## 8. Accessibility Checklist
- Semantic HTML landmarks
- Visible focus ring (2 px primary outline)
- All charts have a text/table alternative
- Color is never the only signal (score labels + icons)
- Full keyboard navigation
- Dark mode with matching contrast
