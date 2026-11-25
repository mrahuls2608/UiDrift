# UIDrift — Design Document

## 1. Design Principles

1. **Clarity first** — every screen answers one question.
2. **Show, don't tell** — show actual component previews, not just numbers.
3. **Practice what we preach** — UIDrift's own UI uses a strict, small token set.
4. **Accessible by default** — WCAG 2.1 AA, keyboard friendly, visible focus.

## 2. Design Tokens (UIDrift's own UI)

### Colors — "Soft Glass"
Taken from the brand reference: pastel glass cards on a soft periwinkle background, gradient pill CTAs and wave art. **Light is the default**; dark is opt-in via the theme toggle (stored in `localStorage`).

| Token | Light (default) | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#EEF0F8` | `#0E0F22` | Page background (plus soft radial glows) |
| `--color-surface` | `#FFFFFF` | `#17193A` | Cards, inputs (glass cards use 66% opacity + blur) |
| `--color-surface-2` | `#F4F5FB` | `#1F2147` | Raised controls, skeletons |
| `--color-border` | `#E2E4F0` | `#2D3060` | Borders, dividers |
| `--color-text` | `#1E1B4B` | `#EEF0FF` | Main text |
| `--color-text-muted` | `#565B78` | `#A6ABCF` | Secondary text |
| `--color-primary` | `#6D4CF2` | `#A594FF` | Links, focus ring, selected states |
| `--color-on-primary` | `#FFFFFF` | `#120F2E` | Text on primary |
| `--color-accent` | `#DB2777` | `#F9A8D4` | Eyebrows, highlights |
| `--color-success` / `warning` / `danger` | `#15803D` / `#B45309` / `#BE123C` | `#4ADE80` / `#FBBF24` / `#FB7185` | Score states |
| `--color-mint` / `--color-mint-ink` | `#D9F3EE` / `#134E4A` | `#12302D` / `#99F6E4` | Pastel benefit tiles |
| `--color-blush` / `--color-blush-ink` | `#FDE2EC` / `#831843` | `#3A1428` / `#FBCFE8` | Pastel benefit tiles |
| `--color-ink` | `#1E1B4B` | `#1E1B4B` | Text on always-light art panels |
| `--gradient-brand` | `#C2185B → #7C3AED → #2563EB` | pastel | Primary pill buttons, CTA band (≥ 4.5:1 with white text at every stop) |

All text/background pairs meet 4.5:1. Every token also works with Tailwind opacity modifiers (`bg-success/10`) via `color-mix`.

### Typography
- Font: **Plus Jakarta Sans** (UI), **JetBrains Mono** (code, tokens)
- Eyebrow labels: 14 px semibold, accent color
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64 px
- Weights: 400, 500, 600, 700
- Line height: 1.5 body, 1.2 headings

### Spacing
4 / 8 / 12 / 16 / 24 / 32 / **44** / 48 / 64 / 96 px — 44 px is the minimum touch target for every interactive element

### Radius
`--radius-sm: 10px` · `--radius-md: 16px` · `--radius-lg: 24px` · `--radius-xl: 32px` · `--radius-full: 9999px` (buttons are pills)

### Shadow
`--shadow-sm` · `--shadow-md` · `--shadow-lg` (soft violet-tinted elevation for glass cards); values differ per theme

## 3. Score Colors

| Score | Label | Color |
|---|---|---|
| 80–100 | Consistent | success |
| 50–79 | Drifting | warning |
| 0–49 | Chaotic | danger |

## 4. Screens

### 4.1 Landing page (`/`, the only public page) — from the brand reference
- Floating glass navigation pill: logo · Features · How it works · Demo · Security · Log in · **Get started** (gradient pill)
- Hero glass card: eyebrow, "Find the UI drift hiding in your product.", copy, **Start your free audit** + **Watch the demo** pills, three icon highlights; right: pastel wave art panel with dotted grid, glass orb and floating score chips
- Benefits glass card (1/3 + 2/3): "Key benefits" with mint/blush tiles and "Explore all features"; "Everything you need" carousel (prev/next) of feature cards with art headers and progress bars; stats bar
- Gallery strip: art · "Your design system, generated" · art
- Demo video, How it works (4 steps), "Same result, LLM or no LLM" privacy section, gradient CTA band, footer

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

### 4.4 Dashboard (`/dashboard`, home after login)
- KPI tiles (audits run, latest, best), audits table (target, Website/Code, score, date, Re-audit), score history per target, demo reports grid
- Line chart of score history per site

### 4.5 Auth (`/login`, `/signup`)
- Two columns: benefits aside + glass form card; `?next=` redirect after login; "Log in as demo user" shortcut (hide with `NEXT_PUBLIC_DEMO_LOGIN=false`)

### 4.6 New audit (`/new`)
- "What do you want to audit?" cards: A live website / Source code
- Website: URL + pages; Source: Upload (ZIP or folder, read in the browser) · GitHub repo · Paste code
- Insights cards: Rule-based (no AI, default) / Use my own LLM → provider, model, password-type API key, base URL (compatible only), privacy note

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
| `Segmented` | radio group as pills or cards |
| `Select` / `Textarea` | label, helper/error text |
| `GradientArt` | palette (aurora, blush, lagoon, iris), orb, dots — decorative |
| `EmptyState` | icon, title, action |
| `Toast` | success, error |

## 6. Interaction & Motion
- Transitions 150–200 ms, ease-out, for hovers and state changes.
- **On-load pop** (`.pop`, `.pop-bounce`): hero elements enter with a springy overshoot (640 ms, `cubic-bezier(0.34, 1.56, 0.64, 1)`), staggered 90 ms; floating chips bounce in, then float.
- **Scroll reveals** (`<Reveal variant="up|pop|zoom|left|right|tilt" delay>`): one IntersectionObserver per element, fires once, animates only `opacity`/`transform`. Content is hidden only when JS runs (`html.js`), so nothing disappears without scripts.
- **Rolling-ball scene** (`RollingSteps`, "How it works"): a 260vh section with a sticky panel. Scroll progress drives a striped ball along a track. Its rotation equals distance ÷ radius (it truly rolls), it hops in an arc between the four stops and squashes on landing, the trail fills, and each step lights up when reached. The physics is a pure, unit-tested function (`lib/motion.ts`). Large screens show all four steps (current one raised); small screens show the current step.
- **Scroll progress bar**: 4 px brand gradient at the top of the landing page.
- Score ring animates from 0 on first load. Skeleton loaders instead of spinners on report sections.
- **Reduced motion:** all of the above is disabled. Reveals show immediately, pops don't animate, and the rolling scene becomes a static four-step list (no sticky scroll).

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
