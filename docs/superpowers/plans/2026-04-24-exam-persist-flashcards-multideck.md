# Exam State Persistence + Flashcards AI Multi-Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two confirmed bugs in EstudIA PWA — (1) active exam state lost on tab switch / navigation, (2) AI flashcard generation cannot target existing or multiple decks — plus ship an audit report covering all 13 routes.

**Architecture:** Lift ExamSimulator's active-run state from component-local `useState` into the Zustand store as a new persisted `activeExam` slice, so navigation away and back restores questions/answers/index/view. Extend the AI flashcard UI with a target-deck selector supporting `new deck`, a single existing deck, or fan-out into multiple existing decks. Both fixes keep persist key `studyflow-state-v2`; shape grows additively so `mergeLegacy` already handles older blobs. Audit runs via webapp-testing skill against the deployed preview.

**Tech Stack:** React 18 + TypeScript (strict) + Vite 5 + Zustand 4 (`persist` middleware + idb-keyval custom storage) + React Router 6 + react-i18next + Tailwind 3 + Framer Motion. Worker proxy (`VITE_WORKER_URL`) for Gemini-backed flashcard generation.

---

## File Structure

**Types / store (persistence)**
- Modify `src/types/index.ts` — add `ActiveExamState` interface + `activeExam: ActiveExamState | null` field on `AppState`.
- Modify `src/store/defaults.ts` — add `activeExam: null` to `DEFAULT_STATE`.
- Modify `src/store/useAppStore.ts` — include `activeExam` in `partialize` + add store actions `startActiveExam`, `updateActiveExam`, `clearActiveExam`.

**Exam simulator (bug 1)**
- Modify `src/features/exams/ExamSimulator.tsx` — replace local `useState` with store selectors/actions for view + questions + answers + currentIdx; keep local `error` + setup-form state local.

**Flashcards AI (bug 2)**
- Modify `src/features/flashcards/Flashcards.tsx` — add target-deck selector state + multi-select UI + dispatch logic (create new, append to one, fan-out to many).

**i18n**
- Modify `src/i18n/locales/ca.json`, `en.json`, `es.json` — add `flashcards.aiTarget.*` keys simultaneously.

**Audit report**
- Create `docs/superpowers/audits/2026-04-24-full-app-audit.md`.

---

## Task 1: Define ActiveExamState type

**Files:**
- Modify: `src/types/index.ts:202-240` (append to `AppState`)

- [ ] **Step 1: Add type + AppState field**

```typescript
// Add after QuizQuestion block (around line 78), before Flashcard:
export interface ActiveExamState {
  topic: string;
  type: QuizType;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  currentIdx: number;
  startedAt: string; // ISO timestamp — lets UI show "resumed from X"
}
```

Then extend `AppState` (line 202 block) by adding:

```typescript
  /** Active exam in progress. null when none running. Persisted across reload/tab switch. */
  activeExam: ActiveExamState | null;
```

- [ ] **Step 2: Verify TS compiles**

Run: `cd C:/Users/alext/Documents/Claude/Projects/Estudi/.claude/worktrees/frosty-pare-47bb41 && npx tsc -b --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(exams): add ActiveExamState type for persisted in-progress exams"
```

---

## Task 2: Add activeExam default

**Files:**
- Modify: `src/store/defaults.ts:51` (before closing brace)

- [ ] **Step 1: Extend DEFAULT_STATE**

Add before the closing `};` of `DEFAULT_STATE`:

```typescript
  activeExam: null,
```

- [ ] **Step 2: Verify TS compiles**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/store/defaults.ts
git commit -m "feat(store): default activeExam to null"
```

---

## Task 3: Persist activeExam + add store actions

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Extend StoreActions interface** (insert inside `StoreActions` around line 44)

```typescript
  /** Start an active exam — replaces any prior in-progress exam. */
  startActiveExam: (exam: import('@/types').ActiveExamState) => void;
  /** Patch the running exam (answers, index, questions after correction). No-op if none. */
  updateActiveExam: (patch: Partial<import('@/types').ActiveExamState>) => void;
  /** Clear the in-progress exam (call on submit or explicit cancel). */
  clearActiveExam: () => void;
```

- [ ] **Step 2: Implement actions inside `create` body** (after `queueConvCards`, before the closing `}),`):

```typescript
      startActiveExam: (exam) => {
        set({ activeExam: exam });
      },

      updateActiveExam: (patch) => {
        set((prev) => ({
          activeExam: prev.activeExam
            ? { ...prev.activeExam, ...patch }
            : prev.activeExam,
        }));
      },

      clearActiveExam: () => {
        set({ activeExam: null });
      },
```

- [ ] **Step 3: Add activeExam to partialize** (inside the object returned by `partialize`, add a line):

```typescript
        activeExam: s.activeExam,
```

Place it at the end of the persisted fields block, immediately before the closing `}),`.

- [ ] **Step 4: Verify TS**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "feat(store): persist activeExam + add start/update/clear actions"
```

---

## Task 4: Write failing test — activeExam round-trip

**Files:**
- Create: `src/store/__tests__/activeExam.test.ts`

**Note:** Project has no test runner configured yet. Install vitest first if `package.json` lacks it.

- [ ] **Step 1: Check for vitest**

Run: `grep -E '"(vitest|jest)"' package.json`
If no match, continue step 2. If match, skip to step 3.

- [ ] **Step 2: Install vitest + fake-indexeddb**

Run:
```bash
npm install -D vitest @vitest/ui fake-indexeddb jsdom
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts` at repo root:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `src/test-setup.ts`:

```typescript
import 'fake-indexeddb/auto';
```

- [ ] **Step 3: Write failing test**

Create `src/store/__tests__/activeExam.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import type { ActiveExamState } from '@/types';

const fixture: ActiveExamState = {
  topic: 'Revolució Francesa',
  type: 'test',
  questions: [
    { id: 'q1', q: 'Any inici?', options: ['1789', '1776', '1815', '1848'], correctAnswer: '1789' },
    { id: 'q2', q: 'Rei executat?', options: ['Lluís XIV', 'Lluís XV', 'Lluís XVI', 'Lluís XVIII'], correctAnswer: 'Lluís XVI' },
  ],
  answers: { q1: '1789' },
  currentIdx: 1,
  startedAt: '2026-04-24T10:00:00.000Z',
};

describe('activeExam persistence', () => {
  beforeEach(() => {
    useAppStore.getState().clearActiveExam();
  });

  it('starts, updates, and clears activeExam', () => {
    useAppStore.getState().startActiveExam(fixture);
    expect(useAppStore.getState().activeExam).toEqual(fixture);

    useAppStore.getState().updateActiveExam({ currentIdx: 2, answers: { q1: '1789', q2: 'Lluís XVI' } });
    const after = useAppStore.getState().activeExam;
    expect(after?.currentIdx).toBe(2);
    expect(after?.answers).toEqual({ q1: '1789', q2: 'Lluís XVI' });

    useAppStore.getState().clearActiveExam();
    expect(useAppStore.getState().activeExam).toBeNull();
  });

  it('updateActiveExam is a no-op when no active exam', () => {
    useAppStore.getState().clearActiveExam();
    useAppStore.getState().updateActiveExam({ currentIdx: 99 });
    expect(useAppStore.getState().activeExam).toBeNull();
  });
});
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test -- activeExam`
Expected: 2 passing. (Actions defined in Task 3, so test should pass immediately — TDD "failing" phase covered by running before Task 3 if executing top-down; here Task 3 landed first. If teaching TDD strictly, revert Task 3 temporarily to watch it fail, then reapply.)

- [ ] **Step 5: Commit**

```bash
git add src/store/__tests__/activeExam.test.ts vitest.config.ts src/test-setup.ts package.json package-lock.json
git commit -m "test(store): cover activeExam start/update/clear actions"
```

---

## Task 5: Rewire ExamSimulator to use store

**Files:**
- Modify: `src/features/exams/ExamSimulator.tsx`

- [ ] **Step 1: Replace active-run local state with store**

Full replacement for lines 1–46 (imports + component head):

```typescript
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { uid, today } from '@/lib/date';
import { generateExam, correctExam } from '@/lib/examAI';
import type { QuizType, QuizQuestion, Quiz, ActiveExamState } from '@/types';
import { motion } from 'framer-motion';

type View = 'setup' | 'loading' | 'taking' | 'results';

export function ExamSimulator(): JSX.Element {
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const quizzes = useAppStore((s) => s.quizzes) || [];
  const addXP = useAppStore((s) => s.addXP);
  const activeExam = useAppStore((s) => s.activeExam);
  const startActiveExam = useAppStore((s) => s.startActiveExam);
  const updateActiveExam = useAppStore((s) => s.updateActiveExam);
  const clearActiveExam = useAppStore((s) => s.clearActiveExam);

  // If an exam was in progress when we unmounted, resume in 'taking' view.
  const [view, setView] = useState<View>(activeExam ? 'taking' : 'setup');

  // Setup State (local — not worth persisting)
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<QuizType>('test');
  const [count, setCount] = useState<number>(5);

  // Results State (local — only valid inside this session)
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Derived from store. Fallbacks keep TS happy when activeExam is null.
  const questions: QuizQuestion[] = activeExam?.questions ?? [];
  const answers: Record<string, string> = activeExam?.answers ?? {};
  const currentIdx: number = activeExam?.currentIdx ?? 0;
  const activeTopic: string = activeExam?.topic ?? topic;
  const activeType: QuizType = activeExam?.type ?? type;

  const startGeneration = async () => {
    if (!topic.trim()) return;
    setError(null);
    setView('loading');
    try {
      const qs = await generateExam(topic, type, count, 'ca');
      const initial: ActiveExamState = {
        topic,
        type,
        questions: qs,
        answers: {},
        currentIdx: 0,
        startedAt: new Date().toISOString(),
      };
      startActiveExam(initial);
      setView('taking');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error generant examen.';
      console.error(e);
      setError(msg);
      setView('setup');
    }
  };

  const handleAnswer = (val: string) => {
    const q = questions[currentIdx];
    if (!q) return;
    updateActiveExam({ answers: { ...answers, [q.id]: val } });
  };

  const goTo = (idx: number) => {
    updateActiveExam({ currentIdx: idx });
  };
```

- [ ] **Step 2: Replace submitExam + navigation handlers**

Locate `submitExam` (around lines 53–107) and the `taking` view's Anterior/Següent buttons (around lines 190–202). Update:

In `submitExam`, replace the two `setQuestions(finalQuestions)` lines and the surrounding flow so the store is updated once on correction completion, then cleared on results render:

```typescript
  const submitExam = async () => {
    setView('loading');
    let finalScore = 0;
    let finalQuestions: QuizQuestion[] = [...questions];

    if (activeType === 'test' || activeType === 'tf') {
      let correctCount = 0;
      finalQuestions = questions.map((q) => {
        const isCorrect = answers[q.id] === q.correctAnswer;
        if (isCorrect) correctCount++;
        return { ...q, userAnswer: answers[q.id], isCorrect };
      });
      finalScore = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    } else {
      try {
        const answeredQs = questions.map((q) => ({ ...q, userAnswer: answers[q.id] || '' }));
        const corrections = await correctExam(answeredQs, 'ca');
        let correctCount = 0;
        finalQuestions = questions.map((q) => {
          const cor = corrections.find((c) => c.id === q.id);
          const isCorrect = cor ? cor.isCorrect : false;
          if (isCorrect) correctCount++;
          return { ...q, userAnswer: answers[q.id], isCorrect, feedback: cor?.feedback };
        });
        finalScore = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error corregint examen.';
        console.error(e);
        setError(msg);
        setView('taking');
        return;
      }
    }

    // Freeze corrected questions into the store so the results view can read them.
    updateActiveExam({ questions: finalQuestions });
    setScore(finalScore);
    addXP(Math.round(finalScore / 2));

    const quiz: Quiz = {
      id: uid(),
      topic: activeTopic,
      type: activeType,
      date: today(),
      score: finalScore,
      questions: finalQuestions,
    };
    patch({ quizzes: [quiz, ...(quizzes || [])] });
    save();

    setView('results');
  };
```

In the `taking` view, change the Anterior + Següent buttons to use `goTo`:

```typescript
          <button className="bp" style={{ background: 'var(--bd)', color: 'var(--t)' }} onClick={() => goTo(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
            Anterior
          </button>
          {!isLast ? (
            <button className="bp" style={{ flex: 1 }} onClick={() => goTo(currentIdx + 1)}>
              Següent
            </button>
          ) : (
            <button className="bp" style={{ flex: 1, background: 'var(--ok)', color: 'white' }} onClick={submitExam}>
              Finalitzar Examen
            </button>
          )}
```

Also replace `type.toUpperCase()` (line 127 area) with `activeType.toUpperCase()`, and the `<h3>{q?.q}</h3>` block reads fine since `q` is already derived from `questions[currentIdx]`.

- [ ] **Step 3: Clear activeExam on "Fer un altre examen"**

Results view (around line 248). Replace:

```typescript
        <button className="bp" style={{ width: '100%', marginTop: 30 }} onClick={() => setView('setup')}>
          Fer un altre examen
        </button>
```

with:

```typescript
        <button className="bp" style={{ width: '100%', marginTop: 30 }} onClick={() => { clearActiveExam(); setView('setup'); }}>
          Fer un altre examen
        </button>
```

- [ ] **Step 4: Add "Abandonar examen" escape hatch** in `taking` view toolbar (above the question, after the `Pregunta X de Y` row)

Insert, right after the opening header `<div>` with question counter:

```typescript
        <button
          className="bs"
          style={{ marginBottom: 16, fontSize: 12, padding: '6px 12px' }}
          onClick={() => {
            if (confirm('Abandonar aquest examen? Es perdrà el progrés.')) {
              clearActiveExam();
              setView('setup');
            }
          }}
        >
          ← Abandonar examen
        </button>
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build green, no TS errors.

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev` (separate terminal), open `/exams`, start Simulator exam, answer one question, navigate to `/timer`, come back.
Expected: exam still on same question with same answer, not reset to setup.

- [ ] **Step 7: Commit**

```bash
git add src/features/exams/ExamSimulator.tsx
git commit -m "fix(exams): persist active exam in Zustand store so tab switch/navigation preserves progress"
```

---

## Task 6: Flashcards AI target-deck selector — state + UI

**Files:**
- Modify: `src/features/flashcards/Flashcards.tsx`

- [ ] **Step 1: Add target-deck selector state** (near existing AI state around lines 47–51)

```typescript
  // AI Target State
  // 'new' = create brand-new deck (current behavior)
  // string[] of deck ids = append into each of these existing decks (fan-out)
  const [aiTarget, setAiTarget] = useState<'new' | string[]>('new');
```

- [ ] **Step 2: Rewrite `handleAIGenerate`** to support all three modes (replace existing function body)

```typescript
  const handleAIGenerate = async () => {
    if (!aiTopic.trim() && !aiFile) return;
    setIsAiLoading(true);
    try {
      const payload: Record<string, unknown> = { count: aiCount, language: 'ca' };
      if (aiTopic.trim()) payload.text = aiTopic;
      if (aiFile) {
        payload.fileData = aiFile.data;
        payload.mimeType = aiFile.type;
      }

      const res = await fetch(`${WORKER_URL}/generate-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error de connexió amb la IA');
      const data: { q: string; a: string }[] = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('La IA no ha generat cap targeta.');
      }

      const mkCards = (): Flashcard[] =>
        data.map((c) => ({
          id: uid(),
          q: c.q,
          a: c.a,
          subject: 'General',
          hits: 0,
          sessionHits: 0,
          nextReview: today(),
          strength: 0,
          interval: 1,
          lastSeen: null,
        }));

      if (aiTarget === 'new') {
        const newDeck: Deck = {
          id: uid(),
          name: `Generat: ${aiTopic.substring(0, 15) || 'Fitxer'}`,
          cards: mkCards(),
        };
        patch({ decks: [newDeck, ...decks] });
      } else if (Array.isArray(aiTarget) && aiTarget.length > 0) {
        // Fan-out: append a fresh card batch into each selected deck so ids stay unique.
        const targetIds = new Set(aiTarget);
        const nextDecks = decks.map((d) =>
          targetIds.has(d.id) ? { ...d, cards: [...d.cards, ...mkCards()] } : d,
        );
        patch({ decks: nextDecks });
      } else {
        throw new Error('Selecciona on desar les targetes.');
      }

      save();
      setAiTopic('');
      setAiFile(null);
      setAiTarget('new');
      showToast({
        title: '✨ Fet!',
        desc:
          aiTarget === 'new'
            ? `S'han generat ${data.length} flashcards en un nou deck.`
            : `S'han afegit ${data.length} flashcards a ${(aiTarget as string[]).length} deck(s).`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconegut';
      showToast({ title: 'Error', desc: msg, kind: 'info' });
    } finally {
      setIsAiLoading(false);
    }
  };
```

- [ ] **Step 3: Render the target-deck selector** in the AI generation panel JSX

Find the block that renders `aiTopic` textarea + `aiCount` + the "Generar" button. Add — right above the submit button:

```tsx
          <div>
            <label className="lbl">{t('flashcards.aiTarget.label')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="aiTarget"
                  checked={aiTarget === 'new'}
                  onChange={() => setAiTarget('new')}
                />
                <span>{t('flashcards.aiTarget.new')}</span>
              </label>

              {decks.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="aiTarget"
                    checked={Array.isArray(aiTarget)}
                    onChange={() => setAiTarget(decks.length > 0 ? [decks[0]!.id] : [])}
                  />
                  <span>{t('flashcards.aiTarget.existing')}</span>
                </label>
              )}

              {Array.isArray(aiTarget) && decks.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    paddingLeft: 24,
                    maxHeight: 160,
                    overflowY: 'auto',
                    borderLeft: '2px solid var(--b)',
                  }}
                >
                  {decks.map((d) => {
                    const checked = (aiTarget as string[]).includes(d.id);
                    return (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const cur = aiTarget as string[];
                            setAiTarget(
                              e.target.checked ? [...cur, d.id] : cur.filter((x) => x !== d.id),
                            );
                          }}
                        />
                        <span>{d.name}</span>
                        <span style={{ color: 'var(--tm)', fontSize: 12 }}>({d.cards.length})</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
```

The `t` helper is already in scope from `useTranslation()` elsewhere in the file; if not, add `import { useTranslation } from 'react-i18next';` and `const { t } = useTranslation();` near the top.

- [ ] **Step 4: Disable submit when multi-target mode has zero selections**

Change the Generar button `disabled` prop to:

```tsx
disabled={
  (!aiTopic.trim() && !aiFile) ||
  (Array.isArray(aiTarget) && aiTarget.length === 0) ||
  isAiLoading
}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/features/flashcards/Flashcards.tsx
git commit -m "feat(flashcards): AI generator can target new deck or fan-out into multiple existing decks"
```

---

## Task 7: Add i18n keys (all 3 locales)

**Files:**
- Modify: `src/i18n/locales/ca.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json`

- [ ] **Step 1: Add `flashcards.aiTarget` block** to each locale

Insert inside each file's `"flashcards"` object (or create the object if absent):

**ca.json:**
```json
"aiTarget": {
  "label": "On desar les targetes",
  "new": "Crear nou deck",
  "existing": "Afegir a decks existents"
}
```

**en.json:**
```json
"aiTarget": {
  "label": "Save cards to",
  "new": "Create new deck",
  "existing": "Add to existing decks"
}
```

**es.json:**
```json
"aiTarget": {
  "label": "Dónde guardar las tarjetas",
  "new": "Crear nuevo deck",
  "existing": "Añadir a decks existentes"
}
```

- [ ] **Step 2: Sanity-check JSON validity**

Run:
```bash
node -e "['ca','en','es'].forEach(l => JSON.parse(require('fs').readFileSync('src/i18n/locales/'+l+'.json','utf8')))"
```
Expected: no output (parse success).

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/ca.json src/i18n/locales/en.json src/i18n/locales/es.json
git commit -m "i18n: add flashcards.aiTarget keys in ca/en/es"
```

---

## Task 8: webapp-testing audit — run + record

**Files:**
- Create: `docs/superpowers/audits/2026-04-24-full-app-audit.md`

- [ ] **Step 1: Boot dev server**

Run (background): `npm run dev`
Wait for Vite to print `Local: http://localhost:5173`.

- [ ] **Step 2: Invoke webapp-testing skill** against the 13 routes

For each route (`/dashboard`, `/timer`, `/cards`, `/feynman`, `/exams`, `/stats`, `/techniques`, `/languages`, `/sounds`, `/recovery`, `/social`, `/cloud`, plus `/` redirect), perform:

1. Load route, screenshot.
2. Interact (click primary CTA, type into any input).
3. Blur tab (open new tab 3 s), return, verify state intact.
4. Soft reload (F5), verify state intact where it should be.
5. Resize viewport to 375×667 (mobile), screenshot → confirm `.bn` bottom nav visible, `.sb` hidden.
6. Cycle `i18n` ca → en → es via language selector (or `localStorage.setItem('i18nextLng', 'en')` + reload). Screenshot each. Confirm no `flashcards.aiTarget.label` style raw-key leaks.
7. Toggle theme via settings. Screenshot light + dark.
8. DevTools → Application → Service Workers → tick "Offline", reload. Confirm shell loads.

- [ ] **Step 3: Write audit report**

File `docs/superpowers/audits/2026-04-24-full-app-audit.md`. Structure:

```markdown
# EstudIA — Full App Audit (2026-04-24)

## Method
- Dev server: http://localhost:5173
- Browser: Chromium via webapp-testing
- Viewports: 1440×900 desktop, 375×667 mobile
- Locales tested: ca (default), en, es
- Themes: dark (default), light
- Network: online + offline (SW)

## Findings

### Critical
| # | Route | Bug | Repro | File |
|---|-------|-----|-------|------|

### Major
| # | Route | Bug | Repro | File |
|---|-------|-----|-------|------|

### Minor
| # | Route | Bug | Repro | File |
|---|-------|-----|-------|------|

## Confirmed Fixes Shipped This Session
- Exam state survives tab switch (Task 5). File: src/features/exams/ExamSimulator.tsx.
- Flashcards AI multi-deck fan-out (Task 6). File: src/features/flashcards/Flashcards.tsx.
```

Fill tables with whatever the skill discovers. Empty section → write "None observed."

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-04-24-full-app-audit.md
git commit -m "docs: audit report for full-app regression sweep (2026-04-24)"
```

---

## Task 9: Code review gate

- [ ] **Step 1: Dispatch typescript-reviewer agent**

Use the Agent tool with `subagent_type: "everything-claude-code:typescript-reviewer"`. Brief: "Review `src/features/exams/ExamSimulator.tsx`, `src/features/flashcards/Flashcards.tsx`, `src/store/useAppStore.ts`, `src/types/index.ts` (diff of this branch vs main). Enforce: strict mode, no any/as, @/ aliases, CSS vars over hex, class system (.c .bp .bs) where applicable."

- [ ] **Step 2: Address every confidence ≥ medium finding**

For each finding, either patch + recommit or justify in a reply comment.

- [ ] **Step 3: Dispatch code-reviewer agent**

Use `subagent_type: "everything-claude-code:code-reviewer"`. Brief: "Project convention pass on the same file set. Enforce CLAUDE.md rules: no relative imports, no inline styles where a class exists, i18n triple-locale parity, Zustand selector usage."

- [ ] **Step 4: Apply fixes, recommit**

---

## Task 10: Final verification

- [ ] **Step 1: Build clean**

Run: `npm run build`
Expected: `✓ built in` + PWA precache note. No TS errors.

- [ ] **Step 2: Unit tests green**

Run: `npm test`
Expected: all tests passing.

- [ ] **Step 3: Manual retest both known bugs**

Manual checklist:
1. Start exam in Simulator → answer q1 → navigate to `/timer` → back to `/exams` → Simulator should resume at q1 with saved answer. ✓
2. Hard reload browser mid-exam → same outcome. ✓
3. Submit exam, view results, click "Fer un altre examen" → clean setup view. ✓
4. Flashcards AI panel shows "Crear nou deck" + "Afegir a decks existents" radio. ✓
5. Select 2+ existing decks → Generar → each selected deck receives a fresh copy. ✓

- [ ] **Step 4: PWA install test**

In Chrome, DevTools → Application → Manifest → Install. Confirm install succeeds, app launches standalone, routes work.

- [ ] **Step 5: Deploy to Pages**

Run: `npx wrangler pages deploy dist --project-name estudia`
Expected: `✨ Deployment complete!` with preview URL.

- [ ] **Step 6: Final commit + branch state**

```bash
git log --oneline -12
git status
```
Expected: clean tree, 8+ commits ahead of main.

---

## Do Not

- Do **not** rewrite the Zustand store architecture — extend only.
- Do **not** change persist key `studyflow-state-v2` (would wipe user data). Shape grows additively; `mergeLegacy` covers missing keys.
- Do **not** touch Worker endpoints (`/generate-cards` etc.) unless an audit finding demands it — log as follow-up instead.
- Do **not** hard-code colors; use `var(--*)` tokens from `src/styles/index.css`.
- Do **not** add new deps beyond vitest tooling without explicit approval.
- Do **not** convert existing inline styles in ExamSimulator/Flashcards to classes as part of this plan — scope creep. Note in audit as follow-up.
- Do **not** scope-creep audit findings into this PR — log each under Minor/Major with file pointer for later triage.
