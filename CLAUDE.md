# EstudIA — Project Specification

## App Identity

- **Name:** EstudIA
- **Branding rule:** Always render as `Estud<strong>IA</strong>` in HTML, or `EstudIA` in plain text. The "IA" suffix must be visually distinct (bold, gradient, or highlighted) in every UI surface where the brand name appears.
- **Tagline:** "The science of academic performance" (Catalan: "La ciència del rendiment acadèmic")
- **Version:** 2.0.0
- **Type:** PWA — offline-first, installable, no server rendering

## Stack

| Layer | Tool |
|---|---|
| UI | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 + custom CSS class system (see below) |
| State | Zustand 4 + idb-keyval persistence |
| Routing | React Router 6 |
| i18n | react-i18next, i18next-browser-languagedetector |
| Auth / DB | Supabase JS v2 |
| AI proxy | Cloudflare Worker (`worker/`) → Gemini 2.5-flash |
| PWA | vite-plugin-pwa + Workbox |
| Animations | Framer Motion |
| SRS | ts-fsrs |

## File Structure

```
src/
├── App.tsx                  # Route declarations, top-level effects
├── main.tsx                 # React root mount
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx      # .sb, .nb, .sb-brand, .sb-ft
│   │   └── BottomNav.tsx    # .bn, .bn-item (mobile only)
│   └── ui/                  # Toast, XPPopup, OnboardingModal, …
├── features/                # One folder per app section
│   ├── dashboard/
│   ├── timer/
│   ├── flashcards/
│   ├── feynman/
│   ├── exams/
│   ├── stats/
│   ├── techniques/
│   ├── languages/
│   ├── sounds/
│   ├── recovery/
│   ├── social/
│   ├── cloud/
│   └── chaos/
├── hooks/
├── i18n/
│   ├── index.ts             # i18next init, SUPPORTED_LOCALES, LOCALE_META
│   └── locales/
│       ├── ca.json          # Catalan — default / fallback
│       ├── en.json
│       └── es.json
├── lib/                     # Pure logic, no React
│   ├── examAI.ts            # → WORKER_URL/exam-generate, /exam-correct
│   ├── feynmanAI.ts         # → WORKER_URL/feynman
│   ├── flashcardsAI.ts      # → WORKER_URL/generate-cards
│   └── supabase.ts
├── store/
│   ├── useAppStore.ts       # Single Zustand store
│   ├── defaults.ts          # DEFAULT_STATE, STATE_KEY
│   ├── persist.ts           # createIdbStorage (idb-keyval)
│   └── migration.ts
├── styles/
│   └── index.css            # ALL design tokens + component classes
└── types/
    └── index.ts             # AppState and all domain types
```

**Path aliases** (configured in both `tsconfig.json` and `vite.config.ts`):

```
@/           → src/
@/components → src/components/
@/features   → src/features/
@/lib        → src/lib/
@/store      → src/store/
@/types      → src/types/
@/hooks      → src/hooks/
@/styles     → src/styles/
```

Always use path aliases — never use relative `../../` imports.

## Design System

### Color Palette

All colors referenced via CSS variables — never hard-code hex in components.

| Variable | Value | Semantic |
|---|---|---|
| `--bg` | `#000000` | Page background |
| `--s` | `rgba(255,255,255,0.03)` | Surface (glass card) |
| `--s2` | `rgba(255,255,255,0.05)` | Surface elevated |
| `--sh` | `rgba(255,255,255,0.08)` | Surface hover |
| `--b` | `rgba(255,255,255,0.10)` | Border subtle |
| `--t` | `#f4f4f5` (zinc-100) | Text primary |
| `--ts` | `#a1a1aa` (zinc-400) | Text secondary |
| `--tm` | `#71717a` (zinc-500) | Text muted |
| `--tw` | `#52525b` (zinc-600) | Text weak |
| `--a` | `#6366f1` | Indigo — primary accent |
| `--al` | `rgba(99,102,241,0.15)` | Indigo tint |
| `--ad` | `#4f46e5` | Indigo dark |
| `--a2` | `#818cf8` | Indigo light |
| `--p` | `#8b5cf6` | Violet |
| `--pl` | `rgba(139,92,246,0.15)` | Violet tint |
| `--ok` | `#10b981` | Emerald — success |
| `--okl` | `rgba(16,185,129,0.15)` | Emerald tint |
| `--w` | `#f59e0b` | Amber — warning |
| `--wl` | `rgba(245,158,11,0.15)` | Amber tint |
| `--err` | `#ef4444` | Red — error |
| `--errl` | `rgba(239,68,68,0.15)` | Red tint |
| `--i` | `#06b6d4` | Cyan — info |
| `--il` | `rgba(6,182,212,0.15)` | Cyan tint |
| `--r` | `#f43f5e` | Rose |
| `--rl` | `rgba(244,63,94,0.15)` | Rose tint |

A full `[data-theme='light']` override set exists in `src/styles/index.css`.

### Typography

| Role | Font | Usage |
|---|---|---|
| Body / UI | Inter | All body text, buttons, inputs |
| Brand | Roboto Slab 800 | `.brand-logo` class only |

Both fonts loaded from Google Fonts (inline in `index.html`). `-webkit-font-smoothing: antialiased` applied globally.

### Spacing & Shape

| Variable | Value | Use |
|---|---|---|
| `--radius` | `16px` | Cards `.c`, large containers |
| `--radius-sm` | `10px` | Buttons, inputs |
| `--radius-xs` | `6px` | Badges, tags |

Use `--shadow`, `--shadow-lg`, `--shadow-glow` — never write `box-shadow` literals.

Use `--transition` (`0.25s cubic-bezier(0.4,0,0.2,1)`) and `--transition-spring` (`0.5s cubic-bezier(0.34,1.56,0.64,1)`) — never write timing literals.

## Component CSS Class System

Never use `style={{}}` for anything that maps to an existing class. Compose these; add Tailwind only for one-off spacing/sizing.

### Layout
- `.sb` — sidebar (240 px, glass, hidden on mobile)
- `.nb` — nav button; `.nb.on` — active
- `.mn` — main content scroll area
- `.sec` — section wrapper (max-width 960px, fade-in)
- `.sec-hdr` — section header (h2 + description p)
- `.bn` — bottom nav bar (mobile, fixed); `.bn-item` / `.bn-item.on`

### Surfaces
- `.c` — glass card (primary surface)
- `.c.glow` — card with hover glow
- `.grad` — indigo/violet gradient card
- `.grad2` — emerald/cyan gradient card
- `.zeig` — warm gradient card with left accent bar
- `.mc` — mode card (selectable); `.mc.on` — selected
- `.flip-card`, `.flip-card-inner`, `.flip-card-front`, `.flip-card-back` — 3-D flip

### Interactive
- `.bp` — primary button (white fill)
- `.bs` — secondary button (glass, bordered)
- `.bi` — icon button (ghost)
- `.bdanger` — destructive button (red tint)
- `.inp` — text input / textarea
- `.lbl` — form label (uppercase, 11px)

### Feedback
- `.badge` — pill badge
- `.tag` — square badge
- `.pb` — progress bar; `.pb .fill` — fill; `.pb-lg` — tall variant
- `.toast` — notification toast (fixed top-right)
- `.xp-pop` — floating XP popup

### Feature-specific
- `.fc` — flashcard face; `.fc .q`, `.fc .a`, `.fc .hint`
- `.msg.user`, `.msg.ai` — Feynman chat messages
- `.heatmap`, `.hm-cell[data-lvl='0'..'4']` — activity heatmap
- `.ach`, `.ach.unlocked`, `.ach.locked` — achievement row
- `.snd-ch` — sound mixer channel
- `.chaos-problem` — chaos mode container
- `.empty` — empty state placeholder

### Utility
- `.card-hover` — translateY(-2px) + shadow on hover
- `.glass` — glass morphism overlay
- `.pulse-glow` — pulsing glow animation
- `.g2` / `.g3` / `.g4` — 2/3/4-column grids (collapse to 1 col on mobile)

**Rule:** New component classes go in `@layer components` in `src/styles/index.css`, never in `.tsx` files.

## TypeScript Conventions

- `strict: true` — all flags enabled (`noUnusedLocals`, `noUnusedParameters`, etc.)
- Target: ES2022, moduleResolution: bundler
- No `any` — use `unknown` and narrow, or define a proper type
- All domain types in `src/types/index.ts`
- `interface` for object shapes; `type` for unions/intersections
- No `as X` casts to silence errors — fix the types

## Zustand Store

One store: `useAppStore` in `src/store/useAppStore.ts`.

```typescript
// Always use a selector
const decks = useAppStore((s) => s.decks);

// Mutations via store actions
const patch = useAppStore((s) => s.patch);
patch({ theme: 'dark' });
```

Persistence: idb-keyval under key `studyflow-state-v2`. Never access IndexedDB directly — always go through the store.

## i18n Conventions

- Default / fallback language: **Catalan (`ca`)**
- Supported: `ca`, `en`, `es`
- Every new translation key must be added to **all three** locale files simultaneously
- Locale files: `src/i18n/locales/{ca,en,es}.json`
- `SUPPORTED_LOCALES` and `LOCALE_META` exported from `src/i18n/index.ts`

## No Inline Styles Rule

```tsx
// Never
<span style={{ color: '#6366f1' }}>...</span>

// Use CSS vars
<span style={{ color: 'var(--a)' }}>...</span>

// Better — use class system
<span className="badge">...</span>
```

## AI Worker Endpoints

Base URL: `import.meta.env.VITE_WORKER_URL` (default: `http://localhost:8787`)

| Endpoint | File | Purpose |
|---|---|---|
| `POST /feynman` | `src/lib/feynmanAI.ts` | Feynman tutor chat |
| `POST /generate-cards` | `src/lib/flashcardsAI.ts` | AI flashcard generation |
| `POST /exam-generate` | `src/lib/examAI.ts` | Exam question generation |
| `POST /exam-correct` | `src/lib/examAI.ts` | Exam answer correction |

Worker source: `worker/src/index.ts` — deploy with `cd worker && npx wrangler deploy`.

## SRS Rules

- Flashcards: `interval *= 2.2`, max 90 days (`src/lib/srs.ts`)
- Languages: `interval *= 2.0`, max 60 days

## Routes

| Path | Feature |
|---|---|
| `/` | redirect → `/dashboard` |
| `/dashboard` | Dashboard |
| `/timer` | Timer |
| `/cards` | Flashcards |
| `/feynman` | AI Tutor (Feynman) |
| `/exams` | Exams |
| `/stats` | Stats |
| `/techniques` | Techniques |
| `/languages` | Languages |
| `/sounds` | Ambient Sounds |
| `/recovery` | Recovery |
| `/social` | Social / Leaderboard |
| `/cloud` | Cloud Sync |

## Deployment

### Frontend — Cloudflare Pages

- **Project name:** `estudia`
- **Build command:** `tsc -b && vite build` (`npm run build`)
- **Output directory:** `dist`
- **Deploy:** `npx wrangler pages deploy dist --project-name estudia`
- **Auth:** `CLOUDFLARE_API_TOKEN` env var (needs `Cloudflare Pages: Edit` + `Account: Read`)

The `SessionStart` hook in `.claude/settings.json` runs build + deploy automatically on every Claude Code session open.

### Worker — Cloudflare Workers

- **Worker name:** `estudia-ai`
- **Deploy:** `cd worker && npx wrangler deploy`
- **Config:** `worker/wrangler.toml`
- **Secret:** `GEMINI_API_KEY` (set via `wrangler secret put GEMINI_API_KEY`)

### Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `VITE_WORKER_URL` | `.env.local` | Worker URL for local dev |
| `CLOUDFLARE_API_TOKEN` | Shell env | Wrangler auth for Pages deploy |
| `GEMINI_API_KEY` | Wrangler secret | Gemini API key (Worker only) |

Never commit `.env.local`.

## PWA

- Service worker: auto-update (`registerType: 'autoUpdate'`)
- Precaches: all `js, css, html, png, svg, woff2, ico`
- Runtime cache: Google Fonts (StaleWhileRevalidate), Worker API routes (NetworkFirst 3s)
- Manifest theme: `#6366f1` (indigo), background: `#0a0a0b`
- Shortcuts: Timer (`/timer`), Flashcards (`/cards`)
