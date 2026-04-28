# EstudIA — Full App Audit
**Date:** 2026-04-25
**Branch:** claude/frosty-pare-47bb41
**Build SHA:** a9fa89eef625dae1f04050340d6ea8d843442053
**Preview URL:** http://localhost:4173

## Summary
- Routes tested: 13 / 13
- Bugs verified fixed: Bug 1 (exam state) PARTIAL, Bug 2 (multi-deck AI) PASS
- Critical findings: 2
- Method: playwright-driven (browser automation via `mcp__plugin_playwright` + static code analysis)

### Critical Findings
1. **/cloud route crashes** — `supabase.createClient('', '')` throws `"supabaseUrl is required"` at module init when `VITE_SUPABASE_URL` is absent, producing a blank page with no error boundary. Severity: HIGH.
2. **Bug 1 partial fix** — `activeExam` persists correctly across navigation but `Exams.tsx` always resets `activeTab` to `'calendar'` on remount, so users must manually re-click "Simulador IA" to see their in-progress exam. The auto-jump is missing. Severity: MEDIUM.

---

## Bug 1 — Exam State Persistence

### Steps Tested
1. Navigated to `/exams`.
2. Injected a fake `activeExam` into IndexedDB (`keyval-store` / `studyflow-state-v2`):
   ```json
   { "topic": "Test Topic Bug1", "type": "test",
     "questions": [{"id":"q1","q":"Question 1?","options":["A","B","C","D"],"correctAnswer":"A"},
                   {"id":"q2","q":"Question 2?","options":["X","Y","Z"],"correctAnswer":"X"}],
     "answers": {"q1": "B"}, "currentIdx": 0, "startedAt": "2026-04-25T..." }
   ```
3. Hard-reloaded to `/exams`. Clicked "Simulador IA" tab.
4. **Observed**: taking view showed "Pregunta 1 de 2 · Tema: Test Topic Bug1 · Tipus: TEST". Option B had `borderColor: var(--a)` (amber highlight), confirming the pre-selected answer was restored. "Abandonar examen" button was present.
5. Navigated in-app to `/timer` via React Router (SPA navigation, no reload). Timer content visible.
6. Navigated back to `/exams`.
7. **Observed**: page lands on `activeTab === 'calendar'` (default). ExamSimulator is not rendered because `activeTab !== 'simulator'`.
8. Clicked "Simulador IA" tab manually → taking view restored with "Pregunta 1 de 2", answer B highlighted, "Abandonar examen" present.

### Verdict: PARTIAL

**What works:** `activeExam` is included in the persisted Zustand slice (`useAppStore.ts:351`) and is correctly restored from IDB on any navigation. `ExamSimulator` reads it on mount and initialises `view = 'taking'` when `activeExam` is truthy.

**What is missing:** `Exams.tsx` line 24 — `useState<'calendar' | ...>('calendar')` always resets `activeTab` to `'calendar'` on component remount. There is no logic to auto-switch to `'simulator'` when `activeExam !== null`. Users must click the tab manually after returning.

**Fix needed in `Exams.tsx`:**
```tsx
const activeExam = useAppStore((s) => s.activeExam);
const [activeTab, setActiveTab] = useState<'calendar' | 'simulator' | 'corrector' | 'zero'>(
  activeExam ? 'simulator' : 'calendar'
);
```

---

## Bug 2 — Flashcards Multi-Deck AI Panel

### Steps Tested
1. Navigated to `/cards` with no decks present.
2. Verified AI panel is visible: heading "Extracció de Conceptes (IA)" renders at `Flashcards.tsx:469` unconditionally — the comment reads `{/* Always-visible AI generation panel */}`, before any empty-state or deck-list block.
3. Confirmed 2 radio inputs, both `name="ai-target"`: "Nuevo deck" (checked, enabled) and "Deck existente" (unchecked, disabled when `decks.length === 0` — intentional UX guard).
4. With decks in store, "Deck existente" radio becomes enabled and clicking it renders a checkbox list of all decks.
5. AI panel remains visible throughout — not gated behind `decks.length > 0`.

### Verdict: PASS

Both radios share `name="ai-target"` (correctly grouped). AI panel is unconditionally rendered before the empty-state block. Multi-deck checkbox list renders when existing-deck radio is selected (`Array.isArray(aiTarget)` guard). The "Deck existente" disabled-when-empty behaviour is correct UX, not a regression.

---

## Per-Route Findings

### / (root)
- **Render:** PASS — Dashboard content renders at `/`. Note: per-spec `"/" → redirect to /dashboard`, but `App.tsx:53` serves Dashboard directly at `"/"`. Route `/dashboard` falls to wildcard and redirects back to `/`. Minor spec deviation; functionally identical.
- **Mobile (375×667):** PASS — sidebar `display:none`, bottom nav visible, `scrollWidth === viewportWidth === 375`, no horizontal scroll.
- **i18n:** PASS — CA: "Benvingut de nou!", EN: "Welcome back!", ES: "¡Bienvenido de nuevo!". Zero raw key strings detected. All 306 keys present in all three locale files (verified programmatically).
- **Theme:** PASS — Toggle switches `data-theme` attribute on `<html>`. Dark: `--bg: #0F0D0A`. Light override set applies.
- **Offline/PWA:** PASS — Service worker registered, `state: 'activated'`, scope `http://localhost:4173/`. Build precaches 43 entries (1029 KiB).
- **Notes:** One console warning on every page: deprecated `apple-mobile-web-app-capable` meta tag.

### /timer
- **Render:** PASS — Pomodoro / Ultradiano / Deep Work mode cards visible. No console errors.
- **Mobile:** PASS.
- **i18n:** PASS.
- **Theme:** PASS — no hardcoded hex in Timer component source.
- **Offline:** PASS.
- **Notes:** No exam-state interference. Timer renders independently of `activeExam`.

### /cards
- **Render:** PASS — AI panel always visible, deck creation form, empty-state guidance, and radio selectors all render. 0 console errors.
- **Mobile:** PASS.
- **i18n:** PASS — `t('cards.aiTarget.label')`, `t('cards.aiTarget.new')`, `t('cards.aiTarget.existing')` resolve; no raw keys in DOM.
- **Theme:** PARTIAL — `Flashcards.tsx:428` uses `background: 'linear-gradient(135deg,#3b82f6,#2563eb)'` (hardcoded blue, not in design tokens). Appears on "Fàcil" grade button in review mode.
- **Offline:** PASS.
- **Bug 2:** PASS.

### /feynman
- **Render:** PASS — Tutor IA heading, topic input, chat area visible. No console errors.
- **Mobile:** PASS.
- **i18n:** PASS.
- **Theme:** PARTIAL — `Feynman.tsx:288`: `color: isListening ? '#fff' : 'var(--t)'`. Hardcoded `#fff` for listening state.
- **Offline:** PASS.

### /exams
- **Render:** PASS — Calendar / Simulador IA / Corrector IA / Desde Cero tabs render. 0 console errors.
- **Mobile:** PASS.
- **i18n:** PASS — `t('nav.zero')` resolves to "Des de Zero" / "From Scratch" / "Desde Cero". No raw keys.
- **Theme:** PARTIAL — `Exams.tsx:81`: `color: activeTab === tab ? '#fff' : 'var(--t)'`; `ZeroSession.tsx:275`: `color: '#000'`.
- **Offline:** PASS.
- **Bug 1:** PARTIAL (see detailed section).

### /stats
- **Render:** PASS — Stats heading, 7-day metrics, achievements section visible. No errors.
- **Mobile:** PASS.
- **i18n:** PASS.
- **Theme:** PASS.
- **Offline:** PASS.

### /techniques
- **Render:** PASS — Evidence-based study techniques visible. No errors.
- **Mobile:** PASS.
- **i18n:** PASS.
- **Theme:** PASS.
- **Offline:** PASS.

### /languages
- **Render:** PASS — Language deck form and empty state visible. No errors.
- **Mobile:** PASS.
- **i18n:** PASS.
- **Theme:** PASS.
- **Offline:** PASS.

### /sounds
- **Render:** PASS — Sound mixer with 6 channels (Rain, Café, Fire, Forest, Waves, Brown Noise) at 0%. No errors.
- **Mobile:** PASS.
- **i18n:** PASS — Channel names in Catalan.
- **Theme:** PASS.
- **Offline:** PASS.

### /recovery
- **Render:** PASS — NSDR, breathing, stretching content visible. No errors.
- **Mobile:** PASS.
- **i18n:** PASS.
- **Theme:** PASS.
- **Offline:** PASS.

### /social
- **Render:** PASS — Friend code, ranking and friends tabs visible. No errors.
- **Mobile:** PASS.
- **i18n:** PASS.
- **Theme:** PARTIAL — `Social.tsx:73`: `color: '#fff'` on a notification badge.
- **Offline:** PASS.

### /cloud
- **Render:** FAIL — Blank page. Two console errors: `Error: supabaseUrl is required` thrown at `createClient('', '')` in `src/lib/supabase.ts:6` because `VITE_SUPABASE_URL` is not set in the preview build. No React error boundary catches this. Snapshot is completely empty.
- **Mobile:** NOT_TESTED.
- **i18n:** NOT_TESTED.
- **Theme:** NOT_TESTED.
- **Offline:** NOT_TESTED.
- **Notes:** `supabase.ts` calls `createClient` unconditionally at module import time. Fix: guard with empty-string check and expose a null-safe client, or add per-route error boundary.

---

## Cross-Cutting Issues

### Hardcoded hex colors in inline styles (design system violation)
The following violate the rule "never hard-code hex in components":

| File | Line | Value | Issue |
|---|---|---|---|
| `Flashcards.tsx` | 428 | `#3b82f6, #2563eb` | Blue gradient not in design tokens |
| `Feynman.tsx` | 288 | `#fff` | Listening-state text color |
| `Dashboard.tsx` | 66, 128, 161 | `#0F0D0A` | Should be `var(--bg)` |
| `Social.tsx` | 73 | `#fff` | Badge text color |
| `Exams.tsx` | 81 | `#fff` | Active tab label color |
| `ZeroSession.tsx` | 275 | `#000` | Step-number text color |
| `CloudSync.tsx` | 141 | `#000` | Button text color |

Minor impact in current dark theme; could cause contrast failures with theme extensions.

### /cloud missing error boundary
Module-level Supabase client creation crash blanks the entire route. No `<ErrorBoundary>` wraps lazy-loaded routes in `App.tsx`.

### Root "/" does not redirect to "/dashboard"
Spec: `"/" → redirect to /dashboard`. Implementation: Dashboard renders at `"/"` directly; `/dashboard` catches wildcard and redirects to `"/"`. Deep links to `/dashboard` silently fail.

### Deprecated PWA meta tag
`<meta name="apple-mobile-web-app-capable" content="yes">` generates a browser warning on every page load. Should also include `<meta name="mobile-web-app-capable" content="yes">`.

### i18n locale parity
All 306 keys are present in `ca.json`, `en.json`, and `es.json` — full parity confirmed. No raw key strings detected in the DOM across any tested locale.

---

## Recommendations (ordered by severity)

1. **[CRITICAL] Fix /cloud crash** — Guard `createClient` in `src/lib/supabase.ts` against empty URL, render an informative fallback when Supabase env vars are absent, and add a `<ErrorBoundary>` wrapper around lazy-loaded routes in `App.tsx`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.example`.

2. **[HIGH] Complete Bug 1 fix** — In `Exams.tsx:24`, initialise `activeTab` using `activeExam` from the store:
   ```tsx
   const activeExam = useAppStore((s) => s.activeExam);
   const [activeTab, setActiveTab] = useState<...>(activeExam ? 'simulator' : 'calendar');
   ```

3. **[MEDIUM] Add `/dashboard` route** — Add `<Route path="/dashboard" element={<Dashboard />} />` (or redirect) so the documented URL works. Current wildcard silently redirects to `/`.

4. **[LOW] Eliminate hardcoded hex in inline styles** — Replace `#fff`, `#000`, `#0F0D0A`, `#3b82f6`, `#2563eb` with CSS variables across the 7 identified files.

5. **[LOW] Fix deprecated PWA meta tag** — Replace or supplement `apple-mobile-web-app-capable` with `mobile-web-app-capable` in `index.html`.

6. **[LOW] Add global React ErrorBoundary** — Wrap route-level `<Suspense>` children in an `<ErrorBoundary>` so any future module-init failure degrades gracefully rather than producing a blank page.
