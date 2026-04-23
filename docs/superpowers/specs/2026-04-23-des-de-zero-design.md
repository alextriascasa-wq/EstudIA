# Des de Zero — Feature Design

**Date:** 2026-04-23  
**Status:** Approved  
**Scope:** Remove Chaos Mode · Add "Des de Zero" tab to /exams

---

## Context

EstudIA currently has a "Mode Caos" (Chaos Mode) tab inside `/exams` that implements interleaved practice — useful for reinforcing material you already know. However, there is no feature for the opposite scenario: a student who knows **absolutely nothing** about an exam topic and cannot yet do practice tests or interleaved drills.

The new "Des de Zero" tab fills this gap using the **Worked Example Effect** (Sweller, 1985/Cognitive Load Theory) for STEM subjects and **Active Recall with no prerequisites** (Dunlosky et al., 2013 + Chi Self-Explanation) for humanities. Both methods are already referenced in the app's Techniques section. Huberman's "immediate self-testing post-exposure" protocol (2024) also validates the 4-step wizard structure.

---

## Changes

### 1. Remove Chaos Mode

Remove entirely:
- `src/features/chaos/ChaosMode.tsx` — delete file
- Tab `'chaos'` from `Exams.tsx` tab router and tab bar
- Store state `chaosProblems: ChaosProblem[]` from `useAppStore` / `defaults.ts` / `types/index.ts`
- i18n keys: `chaos.*`, `nav.chaos` from `ca.json`, `en.json`, `es.json`
- Achievement `chaos_10` from achievements list in store/types
- CSS class `.chaos-problem` from `src/styles/index.css`

### 2. Add "Des de Zero" Tab

New file: `src/features/exams/ZeroSession.tsx`

Tab added to `Exams.tsx` as `'zero'` — replaces `'chaos'` slot.

---

## Feature: ZeroSession Wizard

### States

```typescript
type ZeroStep = 'setup' | 'loading' | 'stem-example' | 'stem-practice' | 
                'humanities-map' | 'humanities-recall' | 'results'
```

### Step 1 — Setup

- Textarea: paste notes / topic description (required, min 50 chars)
- Two mode cards (`.mc`): **🔬 Ciències / Tècnica** · **📖 Humanitats / Lletres**
- "Generar sessió" button → calls Worker, transitions to `'loading'`

### Step 2a — STEM: Exemple Resolt (IA)

Worker returns a `StemSession` object:
```typescript
interface StemSession {
  topic: string          // detected topic name
  concept: string        // core concept explained in plain language
  workedExample: {
    problem: string      // the problem statement
    steps: string[]      // step-by-step solution (3–6 steps)
    answer: string       // final answer
  }
  practiceProblems: Array<{
    problem: string
    answer: string
    hints: string[]
  }>
}
```

UI: Shows worked example with numbered steps. User reads before proceeding. "Ho entenc, prova-m'ho" button.

### Step 3a — STEM: Prova't Tu

- Shows first `practiceProblems[0]`
- Textarea for user answer
- "Comprovar" → sends to Worker `/zero-check`
- Shows correct answer + diff feedback
- +20 XP on submit (regardless of score)

### Step 2b — Humanities: Mapa Conceptual (IA)

Worker returns a `HumanitiesSession` object:
```typescript
interface HumanitiesSession {
  topic: string
  conceptMap: {
    themes: string[]
    keyFigures: Array<{ name: string; role: string }>
    timeline?: string[]      // for history
    keyQuotes?: string[]     // for literature
  }
  recallQuestions: Array<{
    question: string
    idealAnswer: string
    rubric: string[]         // 3–4 criteria to self-assess
  }>
}
```

UI: Renders concept map as structured card list (themes, figures, quotes). "Llegit, pregunta'm" button.

### Step 3b — Humanities: Active Recall

- Shows `recallQuestions[0]`
- Textarea for free-text answer
- "Corregir amb IA" → sends answer + ideal answer to Worker `/zero-check-humanities`
- Returns: gaps identified, rubric score, 1–3 flashcard suggestions for gaps
- +20 XP on submit

### Step 4 — Results (both paths)

- Score / rubric summary
- Llacunes identified (bullet list)
- NSDR reminder: "Fes 10–20 min de descans ara per consolidar" (links to Recovery)
- Auto-generated flashcard suggestions → "Crear flashcards" button (populates flashcard deck)
- "Tornar a intentar" · "Tancar"
- XP award: +20 base, +10 bonus if score ≥ 70%

---

## Worker Endpoint

New endpoint in `worker/src/index.ts`:

```
POST /zero-session
Body: { notes: string, mode: 'stem' | 'humanities', language: string }
Returns: StemSession | HumanitiesSession
```

```
POST /zero-check
Body: { problem: string, userAnswer: string, idealAnswer: string }
Returns: { correct: boolean, feedback: string, score: number }
```

Corresponding lib file: `src/lib/zeroSessionAI.ts`

---

## Store Changes

```typescript
// Add to AppState in src/types/index.ts
zeroSessions: ZeroSessionResult[]

interface ZeroSessionResult {
  id: string
  date: string
  topic: string
  mode: 'stem' | 'humanities'
  score: number
  gaps: string[]
}
```

Remove from AppState: `chaosProblems: ChaosProblem[]`

---

## i18n Keys (add to ca.json, en.json, es.json)

```
zero.title        = "Des de Zero"
zero.desc         = "Aprèn des de zero amb exemples resolts i recuperació activa"
zero.setup.placeholder = "Enganxa els teus apunts o descriu el tema de l'examen..."
zero.setup.stem   = "Ciències / Tècnica"
zero.setup.humanities = "Humanitats / Lletres"
zero.setup.cta    = "Generar sessió"
zero.worked.title = "Exemple Resolt"
zero.worked.cta   = "Ho entenc, prova-m'ho"
zero.practice.title = "Prova't Tu"
zero.map.title    = "Mapa Conceptual"
zero.map.cta      = "Llegit, pregunta'm"
zero.recall.title = "Recuperació Activa"
zero.results.title = "Resultats"
zero.results.gaps = "Llacunes detectades"
zero.results.nsdr = "Descansa 10–20 min ara per consolidar el que has après"
zero.results.flashcards = "Crear flashcards per les llacunes"
nav.zero          = "Des de Zero"
```

Remove: `chaos.*`, `nav.chaos`

---

## Scientific Backing

| Path | Method | Source |
|------|--------|--------|
| STEM | Worked Example Effect — novices learn from solved examples before problems | Sweller (1985), Cognitive Load Theory |
| STEM | Immediate self-test post-exposure reduces forgetting ~50% | Huberman Lab (2024) |
| Humanities | Active Recall without prior exercises — retrieval practice from zero | Dunlosky et al. (2013) |
| Humanities | Self-explanation while processing new material | Chi et al. (1989) |
| Both | NSDR post-learning for consolidation | Huberman Lab — already in Recovery feature |

---

## Files to Create / Modify

| Action | File |
|--------|------|
| DELETE | `src/features/chaos/ChaosMode.tsx` |
| CREATE | `src/features/exams/ZeroSession.tsx` |
| CREATE | `src/lib/zeroSessionAI.ts` |
| MODIFY | `src/features/exams/Exams.tsx` — remove chaos tab, add zero tab |
| MODIFY | `src/store/useAppStore.ts` — remove chaosProblems, add zeroSessions |
| MODIFY | `src/store/defaults.ts` — remove chaosProblems default, add zeroSessions: [] |
| MODIFY | `src/store/migration.ts` — handle chaosProblems removal |
| MODIFY | `src/types/index.ts` — remove ChaosProblem, add ZeroSessionResult, StemSession, HumanitiesSession |
| MODIFY | `src/styles/index.css` — remove .chaos-problem, add .zero-step, .zero-map-card |
| MODIFY | `src/i18n/locales/ca.json` + `en.json` + `es.json` |
| MODIFY | `worker/src/index.ts` — add /zero-session + /zero-check endpoints |

---

## Verification

1. `npm run build` passes with no TypeScript errors
2. `/exams` shows 4 tabs: Calendari · Simulador · Corrector · Des de Zero (no Caos)
3. STEM path: paste physics notes → worker returns worked example with steps → practice problem renders → submit answer → results with XP
4. Humanities path: paste literature notes → worker returns concept map + recall questions → answer recall question → AI feedback → flashcard suggestions
5. Store: `chaosProblems` gone from persisted state, `zeroSessions` present
6. i18n: all 3 locales have `zero.*` keys, `chaos.*` keys removed
7. Build size: `Exams-*.js` chunk should be similar or slightly larger (ZeroSession adds ~8–12 KB)
