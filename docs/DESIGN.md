# UIDrift — Design Document

## 1. Design Principles

1. **Clarity first** — every screen answers one question.
2. **Show, don't tell** — show actual component previews, not just numbers.
3. **Practice what we preach** — UIDrift's own UI uses a strict, small token set.
4. **Accessible by default** — WCAG 2.1 AA, keyboard friendly, visible focus.

## 2. Design Tokens (UIDrift's own UI)

### Colors — "Drift Console"
Dark is the default theme (developer-tool context, chosen with the ui-ux-pro-max design-system search: *Dark Mode (OLED)* style, "code dark + run green" palette). Light is opt-in through the theme toggle and stored in `localStorage`.

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--color-bg` | `#0B1120` | `#F8FAFC` | Page background |
| `--color-surface` | `#131B2E` | `#FFFFFF` | Cards |
| `--color-surface-2` | `#1B2438` | `#F1F5F9` | Raised controls, table hover, skeletons |
| `--color-border` | `#2A3550` | `#DBE2EA` | Borders, dividers |
| `--color-text` | `#F1F5F9` | `#0F172A` | Main text |
| `--color-text-muted` | `#94A3B8` | `#475569` | Secondary text |
| `--color-primary` | `#22C55E` | `#15803D` | Primary actions, links, focus ring |
| `--color-on-primary` | `#052E16` | `#FFFFFF` | Text on primary |
| `--color-accent` | `#818CF8` | `#4F46E5` | Code highlights, secondary emphasis |
| `--color-success` | `#4ADE80` | `#15803D` | Good scores |
| `--color-warning` | `#FBBF24` | `#B45309` | Medium scores |
| `--color-danger` | `#F87171` | `#B91C1C` | Poor scores, a11y errors |

All text/background pairs meet 4.5:1. Every token also works with Tailwind opacity modifiers (`bg-success/10`) via `color-mix`.

### Typography
- Font: **IBM Plex Sans** (UI), **JetBrains Mono** (code, tokens, labels, numbers)
- Eyebrow labels: mono, 12 px, uppercase, primary color
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64 px
- Weights: 400, 500, 600, 700
- Line height: 1.5 body, 1.2 headings

### Spacing
4 / 8 / 12 / 16 / 24 / 32 / **44** / 48 / 64 / 96 px — 44 px is the minimum touch target for every interactive element

### Radius
`--radius-sm: 6px` · `--radius-md: 10px` · `--radius-lg: 16px` · `--radius-full: 9999px`

### Shadow
`--shadow-sm` · `--shadow-md` · `--glow` (primary-tinted ring for hover/focus on primary actions); values differ per theme

## 3. Score Colors

| Score | Label | Color |
|---|---|---|
| 80–100 | Consistent | success |
| 50–79 | Drifting | warning |
| 0–49 | Chaotic | danger |

## 4. Screens

### 4.1 Landing page (`/`) — *Product Demo + Features* pattern
- Hero (two columns): eyebrow, headline "Find the UI drift hiding in your website", terminal-style `$ uidrift scan <url>` prompt + **Scan**, trust row, demo-report chips; right: animated report mock-up (drifted buttons collapse into three standards, merged swatches)
- Feature bento: component groups · color sprawl · accessibility · export (each with a live mini-visual)
- How it works: Crawl → Fingerprint → Group → Fix pipeline
- Final CTA band with a second scan prompt
- Footer with GitHub link

### 4.2 Scan progress (`/scan/:id`)
- Progress bar with steps: Queued → Crawling (page x of y) → Extracting → Analysing → Done
- Live log list (latest 5 events)
- "Waking up server…" state when backend is cold
- Cancel button

### 4.3 Report (`/report/:id`)
Layout: left sticky sidebar navigation, main content on the right.

1. **Overview** — big score ring, label, site URL, pages scanned, date, Export + Share buttons, and a *bullet chart* per category (value, qualitative bands, target 80)
2. **Summary cards** — "14 button variants → suggest 3", "37 colors → suggest 12", etc.
3. **Components** — tabs: Buttons / Inputs / Headings / Links / Cards
   - Each group shows a live rendered preview, count, pages it appears on and its key styles
   - Groups sorted by usage (most used = suggested standard)
4. **Colors** — swatch grid, merged groups, usage count
5. **Typography** — font size bar chart, font families list
6. **Spacing & Radius** — value distribution charts
7. **Accessibility** — one card per axe rule with severity, affected elements (page + selector) and a fix link
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
| `BulletBar` | label, value, target, hint |
| `EmptyState` | icon, title, action |
| `Toast` | success, error |

## 6. Interaction & Motion
- Transitions 150–200 ms, ease-out; entrance reveals 420 ms staggered by 70 ms (CSS only)
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
