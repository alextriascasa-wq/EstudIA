# Personalized Onboarding & Study Plan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture user study profile in onboarding, persist it, derive a transparent improvement % + personalized study plan, and wire those into Dashboard, a new `/plan` route, and a `/perfil` editor.

**Architecture:** New `studyProfile: StudyProfile | null` slice on AppState (single source of truth). Pure-function libs (`improvement.ts`, `plan.ts`) compute derived data on demand. Wizard refactored to `src/components/onboarding/` folder (one file per step). New `/plan` and `/perfil` routes. Optional AI narrative via new worker endpoint `POST /generate-plan`.

**Tech Stack:** React 18 + TS strict, Zustand 4 + idb-keyval, react-router-dom 6, react-i18next, framer-motion, Vitest, lucide-react, Cloudflare Worker (Gemini 2.5-flash).

**Spec source:** `C:\Users\alext\.claude\plans\necessito-que-millorem-la-tingly-lobster.md`

**Critical naming note:** spec used `UserProfile` but that name is already taken by the **social** profile in `src/types/index.ts:312`. This plan uses **`StudyProfile`** everywhere to avoid collision.

**Routing note:** spec referenced `/dashboard` but the Dashboard route is actually `/` (see `src/App.tsx:69`). New routes: `/plan` and `/perfil`. BottomNav stays as-is (5 mobile tabs); plan is sidebar-only + reachable from Dashboard CTA (YAGNI vs cramming a 6th mobile tab).

---

## File Map

**Modify:**
- `src/types/index.ts` — add `StudyProfile` types + `Tab` union extension + AppState fields
- `src/store/defaults.ts` — add 3 new field defaults
- `src/store/useAppStore.ts` — actions + extend `partialize`
- `src/App.tsx` — replace `OnboardingModal` import, add 2 routes
- `src/components/Layout/Sidebar.tsx` — add Plan nav entry + i18n key
- `src/i18n/locales/{ca,en,es}.json` — new namespaces
- `worker/src/index.ts` — add `/generate-plan` endpoint
- `src/features/dashboard/Dashboard.tsx` — banner, today plan, recommended modules

**Delete:**
- `src/components/ui/OnboardingModal.tsx` — replaced by new wizard folder

**Create:**
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/steps/StepGoal.tsx`
- `src/components/onboarding/steps/StepLevel.tsx`
- `src/components/onboarding/steps/StepSubjects.tsx`
- `src/components/onboarding/steps/StepExamDate.tsx`
- `src/components/onboarding/steps/StepMethod.tsx`
- `src/components/onboarding/steps/StepMinutes.tsx`
- `src/components/onboarding/steps/StepTime.tsx`
- `src/components/onboarding/steps/StepObstacle.tsx`
- `src/components/onboarding/steps/StepRetention.tsx`
- `src/components/onboarding/steps/Processing.tsx`
- `src/components/onboarding/steps/Results.tsx`
- `src/lib/improvement.ts`
- `src/lib/plan.ts`
- `src/lib/planAI.ts`
- `src/lib/__tests__/improvement.test.ts`
- `src/lib/__tests__/plan.test.ts`
- `src/hooks/usePlan.ts`
- `src/features/plan/Plan.tsx`
- `src/features/profile/Profile.tsx`

---

## Task 1: Add `StudyProfile` types

**Files:**
- Modify: `src/types/index.ts` (append after line 309 `Tab` union)

- [ ] **Step 1: Append new types to `src/types/index.ts`**

Add at the end of the file (after line 361, after `Challenge` interface):

```ts
// ─── Study Profile / Personalized Plan ────────────────────────────────────────

export type StudyGoal = 'exam' | 'language' | 'cert' | 'university' | 'other';
export type StudyMethod = 'read' | 'manual' | 'digital' | 'mixed';
export type Obstacle = 'memory' | 'time' | 'focus' | 'motivation' | 'comprehension';
export type SessionLength = 15 | 30 | 60 | 90;
export type AcademicLevel = 'eso' | 'batx' | 'uni' | 'oposicio' | 'other';
export type PreferredStudyTime = 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
export type SelfRetention = 1 | 2 | 3 | 4 | 5;

export interface StudyProfile {
  goal: StudyGoal;
  level: AcademicLevel;
  subjects: string[]; // free-text tags, max 5
  method: StudyMethod;
  obstacle: Obstacle;
  dailyMinutes: SessionLength;
  preferredTime: PreferredStudyTime;
  selfRetention: SelfRetention;
  examDate: string | null; // ISO yyyy-mm-dd; only when goal ∈ {exam,cert,university}
  completedAt: string; // ISO timestamp
  version: 1;
}

export type RecommendedModule =
  | 'cards'
  | 'feynman'
  | 'timer'
  | 'exams'
  | 'languages'
  | 'sounds'
  | 'recovery';

export interface ImprovementFactor {
  key: 'srs' | 'feynman' | 'spacing' | 'consistency' | 'focus' | 'memory';
  labelKey: string; // i18n key under improvement.factors.*
  delta: number; // percentage points
  reasonKey: string; // i18n key under improvement.reasons.*
}

export interface ImprovementBreakdown {
  baseline: number; // 0..100
  factors: ImprovementFactor[];
  projected: number; // capped at 95
  delta: number; // projected - baseline
}

export interface ModuleRecommendation {
  module: RecommendedModule;
  priority: 'essential' | 'recommended' | 'optional';
  reasonKey: string; // i18n key under plan.reasons.*
}

export interface DailyBlock {
  order: number;
  module: RecommendedModule;
  minutes: number;
}

export interface PlanMilestone {
  whenISO: string; // ISO yyyy-mm-dd
  goalKey: string; // i18n key under plan.milestones.*
  metric: 'cards_reviewed' | 'feynman_sessions' | 'exam_score' | 'streak_days';
  target: number;
}

export interface StudyPlan {
  weeklyMinutes: number;
  modules: ModuleRecommendation[]; // sorted essential → recommended → optional
  dailyTemplate: DailyBlock[];
  milestones: PlanMilestone[];
}
```

- [ ] **Step 2: Extend `Tab` union (same file, lines 296–308)**

Replace the existing `Tab` type:

```ts
export type Tab =
  | 'dashboard'
  | 'timer'
  | 'cards'
  | 'feynman'
  | 'languages'
  | 'sounds'
  | 'recovery'
  | 'exams'
  | 'stats'
  | 'techniques'
  | 'social'
  | 'cloud'
  | 'plan'
  | 'profile';
```

- [ ] **Step 3: Add new AppState fields (same file, inside `AppState` interface, after line 263 `activeExam`)**

Add at the end of the `AppState` interface body, before closing `}`:

```ts
  /** Personalized study profile captured in onboarding. null until completed. */
  studyProfile: StudyProfile | null;
  /** True after user dismisses the "complete your profile" banner once. */
  profileBannerDismissed: boolean;
  /** Optional AI-generated motivational narrative for /plan page. null until refined. */
  planNarrative: string | null;
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS (consumers don't reference the new fields yet, but type union/interface must compile).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add StudyProfile + plan types for personalized onboarding"
```

---

## Task 2: Wire defaults + persistence

**Files:**
- Modify: `src/store/defaults.ts`
- Modify: `src/store/useAppStore.ts:358-391` (partialize block)

- [ ] **Step 1: Add new defaults to `DEFAULT_STATE`**

In `src/store/defaults.ts`, add three lines inside `DEFAULT_STATE` object (before closing `};`, after `activeExam: null,`):

```ts
  studyProfile: null,
  profileBannerDismissed: false,
  planNarrative: null,
```

- [ ] **Step 2: Extend `partialize` in store**

In `src/store/useAppStore.ts`, inside the `partialize` returned object (lines 358–391), add three entries before the closing `})` of `partialize`:

```ts
        studyProfile: s.studyProfile,
        profileBannerDismissed: s.profileBannerDismissed,
        planNarrative: s.planNarrative,
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/store/defaults.ts src/store/useAppStore.ts
git commit -m "feat(store): persist studyProfile + plan banner + narrative fields"
```

---

## Task 3: Add store actions

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Extend `StoreActions` interface**

In `src/store/useAppStore.ts`, inside the `StoreActions` interface (lines 31–67), append:

```ts
  /** Replace the entire study profile (full wizard submission). */
  setStudyProfile: (p: StudyProfile) => void;
  /** Patch existing study profile (used by /perfil edit). No-op if null. */
  updateStudyProfile: (patch: Partial<StudyProfile>) => void;
  /** Mark the "complete your profile" banner as dismissed. */
  dismissProfileBanner: () => void;
  /** Persist AI-generated narrative for the plan page. */
  setPlanNarrative: (text: string | null) => void;
```

Add the import at the top (line 4 region):

```ts
import type {
  AppState,
  AuthState,
  DailyLogEntry,
  ConvMessage,
  LangCard,
  ConvSession,
  StudyProfile,
  SyncStatus,
} from '@/types';
```

- [ ] **Step 2: Implement actions inside `create<AppStore>()` body (after `clearActiveExam`, line 349)**

Add before the closing `}),` of the actions block:

```ts
      setStudyProfile: (p) => {
        set({ studyProfile: p, hasCompletedOnboarding: true });
        get().save();
      },

      updateStudyProfile: (patch) => {
        set((prev) => ({
          studyProfile: prev.studyProfile
            ? { ...prev.studyProfile, ...patch, completedAt: new Date().toISOString() }
            : prev.studyProfile,
        }));
        get().save();
      },

      dismissProfileBanner: () => {
        set({ profileBannerDismissed: true });
        get().save();
      },

      setPlanNarrative: (text) => {
        set({ planNarrative: text });
        get().save();
      },
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "feat(store): add setStudyProfile/updateStudyProfile/dismissProfileBanner/setPlanNarrative actions"
```

---

## Task 4: TDD — `improvement.ts` baseline

**Files:**
- Create: `src/lib/__tests__/improvement.test.ts`
- Create: `src/lib/improvement.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/improvement.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeImprovement } from '@/lib/improvement';
import type { StudyProfile } from '@/types';

const base: StudyProfile = {
  goal: 'exam',
  level: 'uni',
  subjects: ['Anatomia'],
  method: 'read',
  obstacle: 'memory',
  dailyMinutes: 30,
  preferredTime: 'evening',
  selfRetention: 3,
  examDate: null,
  completedAt: '2026-04-27T10:00:00.000Z',
  version: 1,
};

describe('computeImprovement', () => {
  it('returns baseline 15 for read+selfRetention 3', () => {
    const r = computeImprovement({ ...base, method: 'read', selfRetention: 3 });
    expect(r.baseline).toBe(15);
  });

  it('returns baseline 25 for manual+selfRetention 3', () => {
    const r = computeImprovement({ ...base, method: 'manual', selfRetention: 3 });
    expect(r.baseline).toBe(25);
  });

  it('returns baseline 35 for digital+selfRetention 3', () => {
    const r = computeImprovement({ ...base, method: 'digital', selfRetention: 3 });
    expect(r.baseline).toBe(35);
  });

  it('returns baseline 30 for mixed+selfRetention 3', () => {
    const r = computeImprovement({ ...base, method: 'mixed', selfRetention: 3 });
    expect(r.baseline).toBe(30);
  });

  it('shifts baseline by +/-5 per selfRetention step from 3', () => {
    const r1 = computeImprovement({ ...base, method: 'read', selfRetention: 1 });
    const r5 = computeImprovement({ ...base, method: 'read', selfRetention: 5 });
    expect(r1.baseline).toBe(5);
    expect(r5.baseline).toBe(25);
  });

  it('adds srs factor +25 when method=read', () => {
    const r = computeImprovement({ ...base, method: 'read' });
    const f = r.factors.find((x) => x.key === 'srs');
    expect(f?.delta).toBe(25);
  });

  it('adds srs factor +25 when method=manual', () => {
    const r = computeImprovement({ ...base, method: 'manual' });
    const f = r.factors.find((x) => x.key === 'srs');
    expect(f?.delta).toBe(25);
  });

  it('adds srs factor +15 when method=mixed', () => {
    const r = computeImprovement({ ...base, method: 'mixed' });
    const f = r.factors.find((x) => x.key === 'srs');
    expect(f?.delta).toBe(15);
  });

  it('omits srs factor when method=digital', () => {
    const r = computeImprovement({ ...base, method: 'digital' });
    expect(r.factors.find((x) => x.key === 'srs')).toBeUndefined();
  });

  it('adds feynman factor +12 when obstacle=comprehension', () => {
    const r = computeImprovement({ ...base, obstacle: 'comprehension' });
    expect(r.factors.find((x) => x.key === 'feynman')?.delta).toBe(12);
  });

  it('adds feynman factor +12 when goal=university', () => {
    const r = computeImprovement({ ...base, goal: 'university', obstacle: 'time' });
    expect(r.factors.find((x) => x.key === 'feynman')?.delta).toBe(12);
  });

  it('adds spacing factor +15 when dailyMinutes <= 30', () => {
    const r = computeImprovement({ ...base, dailyMinutes: 30 });
    expect(r.factors.find((x) => x.key === 'spacing')?.delta).toBe(15);
  });

  it('omits spacing factor when dailyMinutes > 30', () => {
    const r = computeImprovement({ ...base, dailyMinutes: 60 });
    expect(r.factors.find((x) => x.key === 'spacing')).toBeUndefined();
  });

  it('adds consistency factor +10 when preferredTime != flexible', () => {
    const r = computeImprovement({ ...base, preferredTime: 'morning' });
    expect(r.factors.find((x) => x.key === 'consistency')?.delta).toBe(10);
  });

  it('omits consistency factor when preferredTime=flexible', () => {
    const r = computeImprovement({ ...base, preferredTime: 'flexible' });
    expect(r.factors.find((x) => x.key === 'consistency')).toBeUndefined();
  });

  it('adds focus factor +8 when obstacle=focus', () => {
    const r = computeImprovement({ ...base, obstacle: 'focus' });
    expect(r.factors.find((x) => x.key === 'focus')?.delta).toBe(8);
  });

  it('adds memory factor +12 when obstacle=memory', () => {
    const r = computeImprovement({ ...base, obstacle: 'memory' });
    expect(r.factors.find((x) => x.key === 'memory')?.delta).toBe(12);
  });

  it('caps projected at 95', () => {
    const r = computeImprovement({
      ...base,
      method: 'read',
      selfRetention: 5,
      obstacle: 'memory',
      dailyMinutes: 15,
      preferredTime: 'morning',
      goal: 'university',
    });
    expect(r.projected).toBe(95);
  });

  it('delta equals projected minus baseline', () => {
    const r = computeImprovement(base);
    expect(r.delta).toBe(r.projected - r.baseline);
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npm test -- improvement`
Expected: FAIL with "Cannot find module '@/lib/improvement'".

- [ ] **Step 3: Implement `src/lib/improvement.ts`**

Create file with full implementation:

```ts
import type {
  StudyProfile,
  ImprovementBreakdown,
  ImprovementFactor,
} from '@/types';

const BASELINE_BY_METHOD: Record<StudyProfile['method'], number> = {
  read: 15,
  manual: 25,
  digital: 35,
  mixed: 30,
};

export function computeImprovement(p: StudyProfile): ImprovementBreakdown {
  const baseline = Math.max(
    0,
    BASELINE_BY_METHOD[p.method] + (p.selfRetention - 3) * 5,
  );

  const factors: ImprovementFactor[] = [];

  if (p.method === 'read' || p.method === 'manual') {
    factors.push({
      key: 'srs',
      labelKey: 'improvement.factors.srs',
      delta: 25,
      reasonKey: 'improvement.reasons.srs',
    });
  } else if (p.method === 'mixed') {
    factors.push({
      key: 'srs',
      labelKey: 'improvement.factors.srs',
      delta: 15,
      reasonKey: 'improvement.reasons.srsMixed',
    });
  }

  if (p.obstacle === 'comprehension' || p.goal === 'university') {
    factors.push({
      key: 'feynman',
      labelKey: 'improvement.factors.feynman',
      delta: 12,
      reasonKey: 'improvement.reasons.feynman',
    });
  }

  if (p.dailyMinutes <= 30) {
    factors.push({
      key: 'spacing',
      labelKey: 'improvement.factors.spacing',
      delta: 15,
      reasonKey: 'improvement.reasons.spacing',
    });
  }

  if (p.preferredTime !== 'flexible') {
    factors.push({
      key: 'consistency',
      labelKey: 'improvement.factors.consistency',
      delta: 10,
      reasonKey: 'improvement.reasons.consistency',
    });
  }

  if (p.obstacle === 'focus') {
    factors.push({
      key: 'focus',
      labelKey: 'improvement.factors.focus',
      delta: 8,
      reasonKey: 'improvement.reasons.focus',
    });
  }

  if (p.obstacle === 'memory') {
    factors.push({
      key: 'memory',
      labelKey: 'improvement.factors.memory',
      delta: 12,
      reasonKey: 'improvement.reasons.memory',
    });
  }

  const sum = factors.reduce((acc, f) => acc + f.delta, 0);
  const projected = Math.min(95, baseline + sum);
  const delta = projected - baseline;

  return { baseline, factors, projected, delta };
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npm test -- improvement`
Expected: all 18 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/improvement.ts src/lib/__tests__/improvement.test.ts
git commit -m "feat(lib): add transparent improvement % engine with breakdown"
```

---

## Task 5: TDD — `plan.ts` engine

**Files:**
- Create: `src/lib/__tests__/plan.test.ts`
- Create: `src/lib/plan.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/plan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPlan } from '@/lib/plan';
import type { StudyProfile } from '@/types';

const base: StudyProfile = {
  goal: 'exam',
  level: 'uni',
  subjects: ['Anatomia'],
  method: 'read',
  obstacle: 'memory',
  dailyMinutes: 30,
  preferredTime: 'evening',
  selfRetention: 3,
  examDate: null,
  completedAt: '2026-04-27T10:00:00.000Z',
  version: 1,
};

describe('buildPlan', () => {
  it('weeklyMinutes equals dailyMinutes * 7', () => {
    const r = buildPlan({ ...base, dailyMinutes: 30 });
    expect(r.weeklyMinutes).toBe(210);
  });

  it('cards is essential when obstacle=memory', () => {
    const r = buildPlan({ ...base, obstacle: 'memory' });
    expect(r.modules.find((m) => m.module === 'cards')?.priority).toBe('essential');
  });

  it('feynman is essential when obstacle=comprehension', () => {
    const r = buildPlan({ ...base, obstacle: 'comprehension' });
    expect(r.modules.find((m) => m.module === 'feynman')?.priority).toBe('essential');
  });

  it('timer is essential when obstacle=focus', () => {
    const r = buildPlan({ ...base, obstacle: 'focus' });
    expect(r.modules.find((m) => m.module === 'timer')?.priority).toBe('essential');
  });

  it('languages overrides others when goal=language', () => {
    const r = buildPlan({ ...base, goal: 'language', obstacle: 'memory' });
    expect(r.modules[0]?.module).toBe('languages');
    expect(r.modules[0]?.priority).toBe('essential');
  });

  it('exams added when goal=exam', () => {
    const r = buildPlan({ ...base, goal: 'exam' });
    expect(r.modules.find((m) => m.module === 'exams')).toBeDefined();
  });

  it('dailyTemplate sums to dailyMinutes', () => {
    const r = buildPlan({ ...base, dailyMinutes: 60 });
    const total = r.dailyTemplate.reduce((acc, b) => acc + b.minutes, 0);
    expect(total).toBe(60);
  });

  it('dailyTemplate sums to dailyMinutes for 90', () => {
    const r = buildPlan({ ...base, dailyMinutes: 90 });
    const total = r.dailyTemplate.reduce((acc, b) => acc + b.minutes, 0);
    expect(total).toBe(90);
  });

  it('modules sorted essential before recommended before optional', () => {
    const r = buildPlan(base);
    const order = ['essential', 'recommended', 'optional'];
    let lastIdx = 0;
    r.modules.forEach((m) => {
      const idx = order.indexOf(m.priority);
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    });
  });

  it('milestones include +7d and +30d when no examDate', () => {
    const r = buildPlan({ ...base, examDate: null });
    expect(r.milestones.length).toBeGreaterThanOrEqual(2);
    expect(r.milestones.some((m) => m.metric === 'cards_reviewed')).toBe(true);
    expect(r.milestones.some((m) => m.metric === 'streak_days')).toBe(true);
  });

  it('milestones include exam countdown when examDate set', () => {
    const r = buildPlan({
      ...base,
      examDate: '2026-06-01',
      goal: 'exam',
    });
    expect(r.milestones.some((m) => m.metric === 'exam_score')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npm test -- plan`
Expected: FAIL with "Cannot find module '@/lib/plan'".

- [ ] **Step 3: Implement `src/lib/plan.ts`**

Create file:

```ts
import type {
  StudyProfile,
  StudyPlan,
  ModuleRecommendation,
  DailyBlock,
  PlanMilestone,
  RecommendedModule,
} from '@/types';

const PRIORITY_ORDER = { essential: 0, recommended: 1, optional: 2 } as const;

function pickModulesByObstacle(p: StudyProfile): ModuleRecommendation[] {
  const out: ModuleRecommendation[] = [];
  switch (p.obstacle) {
    case 'memory':
      out.push({ module: 'cards', priority: 'essential', reasonKey: 'plan.reasons.cardsMemory' });
      out.push({ module: 'feynman', priority: 'recommended', reasonKey: 'plan.reasons.feynmanMemory' });
      break;
    case 'comprehension':
      out.push({ module: 'feynman', priority: 'essential', reasonKey: 'plan.reasons.feynmanComp' });
      out.push({ module: 'cards', priority: 'recommended', reasonKey: 'plan.reasons.cardsComp' });
      break;
    case 'focus':
      out.push({ module: 'timer', priority: 'essential', reasonKey: 'plan.reasons.timerFocus' });
      out.push({ module: 'sounds', priority: 'recommended', reasonKey: 'plan.reasons.soundsFocus' });
      break;
    case 'time':
      out.push({ module: 'timer', priority: 'essential', reasonKey: 'plan.reasons.timerTime' });
      out.push({ module: 'cards', priority: 'recommended', reasonKey: 'plan.reasons.cardsTime' });
      break;
    case 'motivation':
      out.push({ module: 'timer', priority: 'essential', reasonKey: 'plan.reasons.timerMotiv' });
      out.push({ module: 'recovery', priority: 'recommended', reasonKey: 'plan.reasons.recoveryMotiv' });
      break;
  }
  return out;
}

function buildModules(p: StudyProfile): ModuleRecommendation[] {
  // Goal=language overrides everything: languages goes first.
  if (p.goal === 'language') {
    const obstacleMods = pickModulesByObstacle(p).map((m) => ({
      ...m,
      priority: 'optional' as const,
    }));
    return [
      { module: 'languages', priority: 'essential', reasonKey: 'plan.reasons.languagesGoal' },
      ...obstacleMods,
    ];
  }

  const mods = pickModulesByObstacle(p);

  if (p.goal === 'exam' || p.goal === 'cert' || p.goal === 'university') {
    if (!mods.some((m) => m.module === 'exams')) {
      mods.push({ module: 'exams', priority: 'recommended', reasonKey: 'plan.reasons.examsGoal' });
    }
  }

  // Sort by priority order
  return mods.slice().sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
}

function buildDailyTemplate(
  modules: ModuleRecommendation[],
  dailyMinutes: number,
): DailyBlock[] {
  const essentials = modules.filter((m) => m.priority === 'essential');
  const recommended = modules.filter((m) => m.priority === 'recommended');

  // Pick top 3 for blocks: all essentials first, then fill with recommended.
  const picks: RecommendedModule[] = [];
  essentials.forEach((m) => picks.push(m.module));
  recommended.forEach((m) => {
    if (picks.length < 3 && !picks.includes(m.module)) picks.push(m.module);
  });
  if (picks.length === 0) picks.push('cards');

  // Distribute minutes: first block gets 50%, rest split remainder.
  const blocks: DailyBlock[] = [];
  if (picks.length === 1) {
    blocks.push({ order: 1, module: picks[0]!, minutes: dailyMinutes });
  } else if (picks.length === 2) {
    const firstMin = Math.round(dailyMinutes * 0.6);
    blocks.push({ order: 1, module: picks[0]!, minutes: firstMin });
    blocks.push({ order: 2, module: picks[1]!, minutes: dailyMinutes - firstMin });
  } else {
    const firstMin = Math.round(dailyMinutes * 0.5);
    const secondMin = Math.round(dailyMinutes * 0.3);
    const thirdMin = dailyMinutes - firstMin - secondMin;
    blocks.push({ order: 1, module: picks[0]!, minutes: firstMin });
    blocks.push({ order: 2, module: picks[1]!, minutes: secondMin });
    blocks.push({ order: 3, module: picks[2]!, minutes: thirdMin });
  }
  return blocks;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

function buildMilestones(p: StudyProfile): PlanMilestone[] {
  const today = new Date().toISOString().split('T')[0]!;
  const list: PlanMilestone[] = [
    {
      whenISO: addDays(today, 7),
      goalKey: 'plan.milestones.week1Cards',
      metric: 'cards_reviewed',
      target: 50,
    },
    {
      whenISO: addDays(today, 30),
      goalKey: 'plan.milestones.month1Streak',
      metric: 'streak_days',
      target: 14,
    },
  ];

  if (p.examDate) {
    list.push({
      whenISO: p.examDate,
      goalKey: 'plan.milestones.examDay',
      metric: 'exam_score',
      target: 80,
    });
    // Halfway checkpoint
    const examMs = new Date(p.examDate).getTime();
    const todayMs = new Date(today).getTime();
    if (examMs > todayMs) {
      const midISO = new Date((examMs + todayMs) / 2).toISOString().split('T')[0]!;
      list.push({
        whenISO: midISO,
        goalKey: 'plan.milestones.examMid',
        metric: 'feynman_sessions',
        target: 5,
      });
    }
  }

  return list.sort((a, b) => a.whenISO.localeCompare(b.whenISO));
}

export function buildPlan(p: StudyProfile): StudyPlan {
  const modules = buildModules(p);
  return {
    weeklyMinutes: p.dailyMinutes * 7,
    modules,
    dailyTemplate: buildDailyTemplate(modules, p.dailyMinutes),
    milestones: buildMilestones(p),
  };
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npm test -- plan`
Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plan.ts src/lib/__tests__/plan.test.ts
git commit -m "feat(lib): add deterministic study plan engine (modules, daily template, milestones)"
```

---

## Task 6: Selectors hook

**Files:**
- Create: `src/hooks/usePlan.ts`

- [ ] **Step 1: Create the hooks file**

```ts
import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { buildPlan } from '@/lib/plan';
import { computeImprovement } from '@/lib/improvement';
import type { StudyProfile, StudyPlan, ImprovementBreakdown } from '@/types';

export function useStudyProfile(): StudyProfile | null {
  return useAppStore((s) => s.studyProfile);
}

export function usePlan(): StudyPlan | null {
  const profile = useStudyProfile();
  return useMemo(() => (profile ? buildPlan(profile) : null), [profile]);
}

export function useImprovement(): ImprovementBreakdown | null {
  const profile = useStudyProfile();
  return useMemo(() => (profile ? computeImprovement(profile) : null), [profile]);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePlan.ts
git commit -m "feat(hooks): add useStudyProfile/usePlan/useImprovement selectors"
```

---

## Task 7: Wizard scaffold + step contract

**Files:**
- Create: `src/components/onboarding/OnboardingWizard.tsx`
- Create: `src/components/onboarding/types.ts`

- [ ] **Step 1: Create step contract types**

`src/components/onboarding/types.ts`:

```ts
import type { StudyProfile } from '@/types';

export type DraftProfile = Partial<StudyProfile>;

export interface StepProps<K extends keyof StudyProfile> {
  value: StudyProfile[K] | undefined;
  onChange: (v: StudyProfile[K]) => void;
  onNext: () => void;
  onBack: () => void;
}
```

- [ ] **Step 2: Create the orchestrator**

`src/components/onboarding/OnboardingWizard.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import type { StudyProfile } from '@/types';
import type { DraftProfile } from './types';
import { StepGoal } from './steps/StepGoal';
import { StepLevel } from './steps/StepLevel';
import { StepSubjects } from './steps/StepSubjects';
import { StepExamDate } from './steps/StepExamDate';
import { StepMethod } from './steps/StepMethod';
import { StepMinutes } from './steps/StepMinutes';
import { StepTime } from './steps/StepTime';
import { StepObstacle } from './steps/StepObstacle';
import { StepRetention } from './steps/StepRetention';
import { Processing } from './steps/Processing';
import { Results } from './steps/Results';

type StepKey =
  | 'goal'
  | 'level'
  | 'subjects'
  | 'examDate'
  | 'method'
  | 'minutes'
  | 'time'
  | 'obstacle'
  | 'retention'
  | 'processing'
  | 'results';

const PHASES: Record<StepKey, 1 | 2 | 3 | null> = {
  goal: 1,
  level: 1,
  subjects: 1,
  examDate: 1,
  method: 2,
  minutes: 2,
  time: 2,
  obstacle: 3,
  retention: 3,
  processing: null,
  results: null,
};

export function OnboardingWizard(): JSX.Element | null {
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const studyProfile = useAppStore((s) => s.studyProfile);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const xp = useAppStore((s) => s.xp);
  const decks = useAppStore((s) => s.decks);
  const setStudyProfile = useAppStore((s) => s.setStudyProfile);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [draft, setDraft] = useState<DraftProfile>({});
  const [stepIdx, setStepIdx] = useState(0);

  const steps: StepKey[] = useMemo(() => {
    const goalNeedsDate =
      draft.goal === 'exam' || draft.goal === 'cert' || draft.goal === 'university';
    const list: StepKey[] = [
      'goal',
      'level',
      'subjects',
      ...(goalNeedsDate ? (['examDate'] as StepKey[]) : []),
      'method',
      'minutes',
      'time',
      'obstacle',
      'retention',
      'processing',
      'results',
    ];
    return list;
  }, [draft.goal]);

  if (!hasHydrated) return null;
  // Skip wizard entirely if user has a profile already.
  if (studyProfile) return null;
  // Don't auto-show on existing onboarded users — banner handles re-prompt.
  if (hasCompletedOnboarding && (xp > 0 || decks.length > 0)) return null;

  const cur = steps[stepIdx]!;
  const phase = PHASES[cur];
  const totalPhaseSteps = steps.filter((s) => PHASES[s] === phase).length;
  const phaseStepIdx = steps
    .slice(0, stepIdx + 1)
    .filter((s) => PHASES[s] === phase).length;

  const next = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const change = <K extends keyof StudyProfile>(key: K, v: StudyProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: v }));
  };

  const finalize = () => {
    const profile: StudyProfile = {
      goal: draft.goal!,
      level: draft.level!,
      subjects: draft.subjects ?? [],
      method: draft.method!,
      obstacle: draft.obstacle!,
      dailyMinutes: draft.dailyMinutes!,
      preferredTime: draft.preferredTime!,
      selfRetention: draft.selfRetention!,
      examDate: draft.examDate ?? null,
      completedAt: new Date().toISOString(),
      version: 1,
    };
    setStudyProfile(profile);
    navigate('/');
  };

  const renderStep = () => {
    switch (cur) {
      case 'goal':
        return (
          <StepGoal
            value={draft.goal}
            onChange={(v) => change('goal', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'level':
        return (
          <StepLevel
            value={draft.level}
            onChange={(v) => change('level', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'subjects':
        return (
          <StepSubjects
            value={draft.subjects}
            onChange={(v) => change('subjects', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'examDate':
        return (
          <StepExamDate
            value={draft.examDate}
            onChange={(v) => change('examDate', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'method':
        return (
          <StepMethod
            value={draft.method}
            onChange={(v) => change('method', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'minutes':
        return (
          <StepMinutes
            value={draft.dailyMinutes}
            onChange={(v) => change('dailyMinutes', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'time':
        return (
          <StepTime
            value={draft.preferredTime}
            onChange={(v) => change('preferredTime', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'obstacle':
        return (
          <StepObstacle
            value={draft.obstacle}
            onChange={(v) => change('obstacle', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'retention':
        return (
          <StepRetention
            value={draft.selfRetention}
            onChange={(v) => change('selfRetention', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'processing':
        return <Processing onDone={next} />;
      case 'results':
        return <Results draft={draft as StudyProfile} onFinish={finalize} />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ob-overlay">
      <div className="ob-modal c glow">
        {phase !== null && (
          <div className="ob-progress">
            <span className="ob-phase-label">
              {t(`onboarding.phases.${phase}`)} · {phaseStepIdx}/{totalPhaseSteps}
            </span>
            <div className="pb">
              <motion.div
                className="fill"
                animate={{ width: `${(phaseStepIdx / totalPhaseSteps) * 100}%` }}
              />
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={cur}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Add minimal CSS for `.ob-overlay`, `.ob-modal`, `.ob-progress`, `.ob-phase-label`**

In `src/styles/index.css`, inside `@layer components`, append:

```css
.ob-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.ob-modal {
  max-width: 600px;
  width: 100%;
  text-align: center;
  padding: 36px 28px;
  position: relative;
}
.ob-progress {
  margin-bottom: 28px;
}
.ob-phase-label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tm);
  margin-bottom: 8px;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/types.ts src/components/onboarding/OnboardingWizard.tsx src/styles/index.css
git commit -m "feat(onboarding): scaffold wizard orchestrator + step contract"
```

---

## Task 8: Step components — Goal / Level / Method / Time / Obstacle (5 multiple-choice steps)

**Files:**
- Create: `src/components/onboarding/steps/StepGoal.tsx`
- Create: `src/components/onboarding/steps/StepLevel.tsx`
- Create: `src/components/onboarding/steps/StepMethod.tsx`
- Create: `src/components/onboarding/steps/StepTime.tsx`
- Create: `src/components/onboarding/steps/StepObstacle.tsx`

All five share the same shape: pick-one card grid using `.mc` / `.mc.on` classes.

- [ ] **Step 1: Create `StepGoal.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { StudyGoal } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: StudyGoal[] = ['exam', 'language', 'cert', 'university', 'other'];

export function StepGoal({ value, onChange, onNext, onBack }: StepProps<'goal'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.goal.title')}</h2>
      <p>{t('onboarding.steps.goal.desc')}</p>
      <div className="g2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`mc${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <strong>{t(`onboarding.options.goal.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.goal.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `StepLevel.tsx`** — same shape

```tsx
import { useTranslation } from 'react-i18next';
import type { AcademicLevel } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: AcademicLevel[] = ['eso', 'batx', 'uni', 'oposicio', 'other'];

export function StepLevel({ value, onChange, onNext, onBack }: StepProps<'level'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.level.title')}</h2>
      <p>{t('onboarding.steps.level.desc')}</p>
      <div className="g2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`mc${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <strong>{t(`onboarding.options.level.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.level.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `StepMethod.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { StudyMethod } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: StudyMethod[] = ['read', 'manual', 'digital', 'mixed'];

export function StepMethod({ value, onChange, onNext, onBack }: StepProps<'method'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.method.title')}</h2>
      <p>{t('onboarding.steps.method.desc')}</p>
      <div className="g2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`mc${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <strong>{t(`onboarding.options.method.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.method.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `StepTime.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { PreferredStudyTime } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: PreferredStudyTime[] = ['morning', 'afternoon', 'evening', 'night', 'flexible'];

export function StepTime({ value, onChange, onNext, onBack }: StepProps<'preferredTime'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.time.title')}</h2>
      <p>{t('onboarding.steps.time.desc')}</p>
      <div className="g2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`mc${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <strong>{t(`onboarding.options.time.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.time.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create `StepObstacle.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { Obstacle } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: Obstacle[] = ['memory', 'time', 'focus', 'motivation', 'comprehension'];

export function StepObstacle({ value, onChange, onNext, onBack }: StepProps<'obstacle'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.obstacle.title')}</h2>
      <p>{t('onboarding.steps.obstacle.desc')}</p>
      <div className="g2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`mc${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <strong>{t(`onboarding.options.obstacle.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.obstacle.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Add `.ob-step` CSS hook in `src/styles/index.css`**

Append inside `@layer components`:

```css
.ob-step h2 {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 8px;
  color: var(--t);
}
.ob-step > p {
  font-size: 15px;
  color: var(--ts);
  margin-bottom: 24px;
}
.ob-back {
  margin-top: 20px;
}
```

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/onboarding/steps/StepGoal.tsx src/components/onboarding/steps/StepLevel.tsx src/components/onboarding/steps/StepMethod.tsx src/components/onboarding/steps/StepTime.tsx src/components/onboarding/steps/StepObstacle.tsx src/styles/index.css
git commit -m "feat(onboarding): add 5 multiple-choice step components"
```

---

## Task 9: Step components — Subjects (tag input) + Minutes (4 options) + ExamDate (conditional)

**Files:**
- Create: `src/components/onboarding/steps/StepSubjects.tsx`
- Create: `src/components/onboarding/steps/StepMinutes.tsx`
- Create: `src/components/onboarding/steps/StepExamDate.tsx`

- [ ] **Step 1: Create `StepSubjects.tsx`**

```tsx
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { StepProps } from '../types';

const MAX_SUBJECTS = 5;

export function StepSubjects({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'subjects'>): JSX.Element {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const subjects = value ?? [];

  const addSubject = () => {
    const v = input.trim();
    if (!v || subjects.includes(v) || subjects.length >= MAX_SUBJECTS) return;
    onChange([...subjects, v]);
    setInput('');
  };

  const remove = (s: string) => onChange(subjects.filter((x) => x !== s));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubject();
    }
  };

  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.subjects.title')}</h2>
      <p>{t('onboarding.steps.subjects.desc', { max: MAX_SUBJECTS })}</p>
      <div className="ob-tags">
        {subjects.map((s) => (
          <button key={s} className="tag" onClick={() => remove(s)}>
            {s} ×
          </button>
        ))}
      </div>
      <input
        className="inp"
        placeholder={t('onboarding.steps.subjects.placeholder')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        disabled={subjects.length >= MAX_SUBJECTS}
      />
      <div className="ob-actions">
        <button className="bs" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <button className="bp" onClick={onNext} disabled={subjects.length === 0}>
          {t('common.continue')} →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `StepMinutes.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { SessionLength } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: SessionLength[] = [15, 30, 60, 90];

export function StepMinutes({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'dailyMinutes'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.minutes.title')}</h2>
      <p>{t('onboarding.steps.minutes.desc')}</p>
      <div className="g2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`mc${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <strong>{t('onboarding.options.minutes.label', { min: opt })}</strong>
            <span>{t(`onboarding.options.minutes.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `StepExamDate.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { StepProps } from '../types';

export function StepExamDate({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'examDate'>): JSX.Element {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0]!;
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.examDate.title')}</h2>
      <p>{t('onboarding.steps.examDate.desc')}</p>
      <input
        className="inp"
        type="date"
        min={today}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      />
      <div className="ob-actions">
        <button className="bs" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <button className="bp" onClick={onNext}>
          {t('common.continue')} →
        </button>
        <button className="bi" onClick={() => { onChange(null); onNext(); }}>
          {t('onboarding.steps.examDate.skip')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add `.ob-tags` and `.ob-actions` CSS**

Append in `src/styles/index.css` `@layer components`:

```css
.ob-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  min-height: 32px;
}
.ob-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/steps/StepSubjects.tsx src/components/onboarding/steps/StepMinutes.tsx src/components/onboarding/steps/StepExamDate.tsx src/styles/index.css
git commit -m "feat(onboarding): add subjects/minutes/examDate step components"
```

---

## Task 10: Step components — Retention slider + Processing + Results

**Files:**
- Create: `src/components/onboarding/steps/StepRetention.tsx`
- Create: `src/components/onboarding/steps/Processing.tsx`
- Create: `src/components/onboarding/steps/Results.tsx`

- [ ] **Step 1: Create `StepRetention.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { SelfRetention } from '@/types';
import type { StepProps } from '../types';

const STEPS: SelfRetention[] = [1, 2, 3, 4, 5];

export function StepRetention({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'selfRetention'>): JSX.Element {
  const { t } = useTranslation();
  const current = value ?? 3;
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.retention.title')}</h2>
      <p>{t('onboarding.steps.retention.desc')}</p>

      <div className="ob-retention-slider">
        {STEPS.map((s) => (
          <button
            key={s}
            className={`mc ob-ret-btn${current === s ? ' on' : ''}`}
            onClick={() => onChange(s)}
          >
            <strong>{s}</strong>
          </button>
        ))}
      </div>

      <div className="ob-retention-labels">
        <span className="lbl">{t('onboarding.steps.retention.low')}</span>
        <span className="lbl">{t('onboarding.steps.retention.high')}</span>
      </div>

      <div className="ob-actions">
        <button className="bs" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <button className="bp" onClick={onNext} disabled={value === undefined}>
          {t('common.continue')} →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Processing.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function Processing({ onDone }: { onDone: () => void }): JSX.Element {
  const { t } = useTranslation();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phases = [
    t('onboarding.processing.p1'),
    t('onboarding.processing.p2'),
    t('onboarding.processing.p3'),
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setPhaseIdx(1), 800);
    const t2 = setTimeout(() => setPhaseIdx(2), 1800);
    const t3 = setTimeout(onDone, 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div className="ob-step ob-processing">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        className="ob-spinner"
      >
        ⚙️
      </motion.div>
      <h2>{t('onboarding.processing.title')}</h2>
      <motion.p key={phaseIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {phases[phaseIdx]}
      </motion.p>
      <div className="pb pb-lg">
        <motion.div
          className="fill"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3.8, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `Results.tsx`**

```tsx
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { StudyProfile } from '@/types';
import { computeImprovement } from '@/lib/improvement';
import { buildPlan } from '@/lib/plan';

export function Results({
  draft,
  onFinish,
}: {
  draft: StudyProfile;
  onFinish: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const breakdown = computeImprovement(draft);
  const plan = buildPlan(draft);
  const top = plan.modules.slice(0, 3);

  return (
    <div className="ob-step ob-results">
      <h2>{t('onboarding.results.title')}</h2>
      <p>{t('onboarding.results.desc')}</p>

      <motion.div
        className="c zeig ob-result-stat"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="ob-stat-big">+{breakdown.delta}%</div>
        <div className="lbl">{t('onboarding.results.deltaLabel')}</div>
      </motion.div>

      <div className="c ob-breakdown">
        <div className="lbl">{t('onboarding.results.breakdown')}</div>
        <ul>
          <li>
            <span>{t('improvement.factors.baseline')}</span>
            <strong>{breakdown.baseline}%</strong>
          </li>
          {breakdown.factors.map((f) => (
            <li key={f.key}>
              <span>{t(f.labelKey)}</span>
              <strong className="ok">+{f.delta}%</strong>
            </li>
          ))}
          <li className="ob-breakdown-total">
            <span>{t('onboarding.results.projected')}</span>
            <strong>{breakdown.projected}%</strong>
          </li>
        </ul>
      </div>

      <div className="g3 ob-modules">
        {top.map((m) => (
          <button
            key={m.module}
            className="mc"
            onClick={() => {
              onFinish();
              navigate(`/${m.module === 'cards' ? 'cards' : m.module}`);
            }}
          >
            <strong>{t(`nav.${m.module}`)}</strong>
            <span>{t(m.reasonKey)}</span>
          </button>
        ))}
      </div>

      <div className="ob-actions">
        <button className="bp" onClick={() => { onFinish(); navigate('/plan'); }}>
          {t('onboarding.results.viewPlan')}
        </button>
        <button className="bs" onClick={onFinish}>
          {t('onboarding.results.startNow')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add Results/Processing/Retention CSS**

Append in `src/styles/index.css`:

```css
.ob-retention-slider {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.ob-ret-btn {
  padding: 18px 0;
  font-size: 22px;
}
.ob-retention-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}
.ob-processing {
  text-align: center;
}
.ob-spinner {
  font-size: 60px;
  margin-bottom: 24px;
  display: inline-block;
}
.ob-results .ob-result-stat {
  margin: 16px 0;
  padding: 24px;
  text-align: center;
}
.ob-stat-big {
  font-size: 56px;
  font-weight: 900;
  color: var(--ok);
  font-family: 'Fraunces', serif;
}
.ob-breakdown {
  margin: 16px 0;
  padding: 18px;
  text-align: left;
}
.ob-breakdown ul {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.ob-breakdown li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--bl);
  color: var(--ts);
  font-size: 14px;
}
.ob-breakdown li.ob-breakdown-total {
  border-bottom: none;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 2px solid var(--b);
  color: var(--t);
  font-weight: 700;
}
.ob-breakdown li strong.ok {
  color: var(--ok);
}
.ob-modules {
  margin: 16px 0;
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/steps/StepRetention.tsx src/components/onboarding/steps/Processing.tsx src/components/onboarding/steps/Results.tsx src/styles/index.css
git commit -m "feat(onboarding): add retention slider + processing + results steps"
```

---

## Task 11: Wire wizard into App, delete old modal

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/ui/OnboardingModal.tsx`

- [ ] **Step 1: Update import in `src/App.tsx`**

Replace line 6:

```ts
import { OnboardingModal } from '@/components/ui/OnboardingModal';
```

with:

```ts
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
```

And replace usage line 64 `<OnboardingModal />` with `<OnboardingWizard />`.

- [ ] **Step 2: Delete the old modal**

Delete file: `src/components/ui/OnboardingModal.tsx`

```bash
rm src/components/ui/OnboardingModal.tsx
```

- [ ] **Step 3: Run typecheck + tests**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/ui/OnboardingModal.tsx
git commit -m "feat(onboarding): switch App to OnboardingWizard, drop legacy modal"
```

---

## Task 12: i18n keys — `onboarding.*` namespace

**Files:**
- Modify: `src/i18n/locales/ca.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/es.json`

- [ ] **Step 1: Add the full `onboarding` block to `ca.json`** (Catalan, default)

At the top level of the JSON object, add:

```json
"onboarding": {
  "phases": { "1": "Objectiu", "2": "Hàbits", "3": "Autoavaluació" },
  "common": { "back": "Enrere", "continue": "Continuar" },
  "steps": {
    "goal": {
      "title": "Quin és el teu objectiu?",
      "desc": "T'ajudarem a arribar-hi més ràpid."
    },
    "level": {
      "title": "A quin nivell estudies?",
      "desc": "Ajustem el ritme i la dificultat."
    },
    "subjects": {
      "title": "Quines matèries estudies?",
      "desc": "Afegeix fins a {{max}} matèries.",
      "placeholder": "Ex: Matemàtiques"
    },
    "examDate": {
      "title": "Quan tens l'examen?",
      "desc": "Calcularem fites enrere des d'aquesta data.",
      "skip": "No tinc data fixa"
    },
    "method": {
      "title": "Com estudies habitualment?",
      "desc": "Sigues sincer."
    },
    "minutes": {
      "title": "Quant de temps al dia?",
      "desc": "Adaptarem el pla a la teva disponibilitat."
    },
    "time": {
      "title": "Quan prefereixes estudiar?",
      "desc": "L'hora ancora l'hàbit."
    },
    "obstacle": {
      "title": "Quin és el teu obstacle principal?",
      "desc": "Detectarem on perds rendiment."
    },
    "retention": {
      "title": "Quant recordes del que estudies?",
      "desc": "Una nota del 1 al 5.",
      "low": "Oblido tot",
      "high": "Recordo gairebé tot"
    }
  },
  "options": {
    "goal": {
      "exam": { "title": "Aprovar exàmens", "desc": "Universitat, batxillerat..." },
      "language": { "title": "Dominar un idioma", "desc": "Vocabulari + fluïdesa" },
      "cert": { "title": "Certificacions", "desc": "IT, medicina, finances..." },
      "university": { "title": "Estudis universitaris", "desc": "Comprensió profunda" },
      "other": { "title": "Altres", "desc": "Aprendre per plaer o curiositat" }
    },
    "level": {
      "eso": { "title": "ESO", "desc": "Educació secundària" },
      "batx": { "title": "Batxillerat", "desc": "Selectivitat / PAU" },
      "uni": { "title": "Universitat", "desc": "Grau o postgrau" },
      "oposicio": { "title": "Oposicions", "desc": "Cos públic o concurs" },
      "other": { "title": "Altres", "desc": "Formació personal" }
    },
    "method": {
      "read": { "title": "Llegeixo i subratllo", "desc": "Lectura passiva" },
      "manual": { "title": "Resums i esquemes a mà", "desc": "Escriure per memoritzar" },
      "digital": { "title": "Eines digitals", "desc": "Anki, Quizlet, Notion..." },
      "mixed": { "title": "Combinació de tot", "desc": "Una mica de cada cosa" }
    },
    "minutes": {
      "label": "{{min}} minuts",
      "15": { "desc": "Hàbit diari mínim" },
      "30": { "desc": "Constància òptima" },
      "60": { "desc": "Preparació seriosa" },
      "90": { "desc": "Intensiu / examen pròxim" }
    },
    "time": {
      "morning": { "title": "Matí", "desc": "Cervell fresc" },
      "afternoon": { "title": "Tarda", "desc": "Després de classe / feina" },
      "evening": { "title": "Vespre", "desc": "Final del dia" },
      "night": { "title": "Nit", "desc": "Quan tothom dorm" },
      "flexible": { "title": "Flexible", "desc": "Sense hora fixa" }
    },
    "obstacle": {
      "memory": { "title": "M'oblido del que estudio", "desc": "La ment es queda en blanc" },
      "time": { "title": "Em falta temps", "desc": "El temari és inabastable" },
      "focus": { "title": "Em costa concentrar-me", "desc": "Em distrec fàcilment" },
      "motivation": { "title": "Em costa començar", "desc": "Procrastino sovint" },
      "comprehension": { "title": "No acabo d'entendre", "desc": "Em perdo en els conceptes" }
    }
  },
  "processing": {
    "title": "Construint el teu perfil",
    "p1": "Analitzant les teves respostes...",
    "p2": "Calculant la teva corba d'oblit actual...",
    "p3": "Generant el teu pla personalitzat..."
  },
  "results": {
    "title": "El teu pla està llest",
    "desc": "Calculat sobre les teves respostes, sense màgia.",
    "deltaLabel": "Potencial de millora projectat",
    "breakdown": "Per què aquest número?",
    "projected": "Total projectat",
    "viewPlan": "Veure pla complet",
    "startNow": "Començar ara"
  }
}
```

Also add the `improvement` and `plan` namespaces to `ca.json`:

```json
"improvement": {
  "factors": {
    "baseline": "Punt de partida (mètode actual)",
    "srs": "Repetició espaiada (SRS)",
    "feynman": "Tècnica Feynman amb IA",
    "spacing": "Sessions curtes i espaiades",
    "consistency": "Hàbit a hora fixa",
    "focus": "Pomodoro + sons ambient",
    "memory": "Targetes de memòria activa"
  },
  "reasons": {
    "srs": "Quan reemplaces lectura passiva per recall actiu, la retenció dispara.",
    "srsMixed": "Sistematitzar el SRS multiplica el que ja estàs fent.",
    "feynman": "Explicar conceptes en veu alta detecta llacunes invisibles.",
    "spacing": "Sessions curtes ben espaiades superen maratons.",
    "consistency": "Estudiar a la mateixa hora ancora l'hàbit.",
    "focus": "Pomodoro + soroll de fons redueix distraccions.",
    "memory": "Targetes amb recall força el cervell a recordar."
  }
},
"plan": {
  "title": "El teu pla d'estudi",
  "weeklyMinutes": "{{min}} min/setmana",
  "modulesEssential": "Essencials",
  "modulesRecommended": "Recomanats",
  "modulesOptional": "Opcionals",
  "dailyTemplate": "Estructura diària suggerida",
  "milestones": {
    "title": "Fites",
    "week1Cards": "50 targetes revisades",
    "month1Streak": "14 dies seguits estudiant",
    "examDay": "Dia de l'examen",
    "examMid": "Mig camí: 5 sessions Feynman"
  },
  "reasons": {
    "cardsMemory": "El teu obstacle és la memòria — SRS és la solució directa.",
    "feynmanMemory": "Explicar reforça el record.",
    "feynmanComp": "Si no entens, explicar-ho t'obliga a comprendre.",
    "cardsComp": "Targetes de concepte ajuden a fixar idees clau.",
    "timerFocus": "Pomodoro trenca la sessió en blocs gestionables.",
    "soundsFocus": "Soroll ambient amaga distraccions.",
    "timerTime": "Pomodoro et fa rendir més en menys temps.",
    "cardsTime": "Repassar 10 min al dia val per 1h setmanal.",
    "timerMotiv": "25 min són curts: és més fàcil començar.",
    "recoveryMotiv": "Recuperació activa evita el burnout.",
    "languagesGoal": "El teu objectiu és l'idioma — el mòdul d'idiomes és el cor del pla.",
    "examsGoal": "Practicar amb exàmens simulats prepara la nota."
  },
  "narrative": {
    "title": "Personalitzat amb IA",
    "generate": "Personalitzar amb IA",
    "regenerate": "Regenerar"
  },
  "edit": "Editar perfil"
},
"profile": {
  "title": "El teu perfil d'estudi",
  "save": "Desar canvis",
  "redo": "Refer onboarding",
  "saved": "Perfil desat"
},
"dashboard": {
  "heroPersonal": "Bon dia! Avui {{minutes}} min cap a {{goal}}.",
  "todayPlan": "El teu pla d'avui",
  "profileBanner": {
    "title": "Completa el teu perfil",
    "desc": "60 segons per un pla personalitzat.",
    "cta": "Completar",
    "dismiss": "Ara no"
  }
}
```

- [ ] **Step 2: Mirror the same blocks in `en.json`** (English translations)

Add the same structure with English copy. Key examples:
- `onboarding.steps.goal.title` → `"What's your goal?"`
- `onboarding.steps.goal.desc` → `"We'll help you get there faster."`
- `onboarding.options.goal.exam.title` → `"Pass exams"`
- `improvement.factors.baseline` → `"Baseline (your current method)"`
- `plan.title` → `"Your study plan"`
- `dashboard.profileBanner.title` → `"Complete your profile"`
- `dashboard.profileBanner.cta` → `"Complete"`

(The full key set is identical to the Catalan structure above — translate every leaf string.)

- [ ] **Step 3: Mirror the same blocks in `es.json`** (Spanish)

Same structure, Spanish copy. Examples:
- `onboarding.steps.goal.title` → `"¿Cuál es tu objetivo?"`
- `onboarding.options.goal.exam.title` → `"Aprobar exámenes"`
- `dashboard.profileBanner.title` → `"Completa tu perfil"`

- [ ] **Step 4: Add `nav.plan` and `nav.profile` keys** in all three locales (top-level `nav` object)

In each file find `"nav": { ... }` and add inside:

```json
"plan": "Pla",
"profile": "Perfil"
```

(For `en.json` use `"Plan"` / `"Profile"`; for `es.json` use `"Plan"` / `"Perfil"`.)

- [ ] **Step 5: Add `common.back` and `common.continue` keys** if not already present

In each locale's `common` namespace, ensure:
- `ca`: `"back": "Enrere", "continue": "Continuar"`
- `en`: `"back": "Back", "continue": "Continue"`
- `es`: `"back": "Atrás", "continue": "Continuar"`

- [ ] **Step 6: Run app + visually verify wizard renders translated strings**

Run: `npm run dev`. Open `http://localhost:5173/`, clear IndexedDB if needed (`DevTools → Application → IndexedDB → studyflow-state-v2 → Delete`), reload, complete wizard. Switch language with the locale buttons in sidebar — every label should change.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/locales/ca.json src/i18n/locales/en.json src/i18n/locales/es.json
git commit -m "feat(i18n): add onboarding/improvement/plan/profile/dashboard.banner keys (ca/en/es)"
```

---

## Task 13: Dashboard — banner + Today's plan + Recommended modules

**Files:**
- Modify: `src/features/dashboard/Dashboard.tsx`

- [ ] **Step 1: Read current `Dashboard.tsx`** to find an insertion point (typically after the hero, before existing widgets).

Run: `cat src/features/dashboard/Dashboard.tsx | head -80`. Identify the JSX root and the first widget block.

- [ ] **Step 2: Add imports at the top of `Dashboard.tsx`**

Add (or merge into existing imports):

```tsx
import { Link } from 'react-router-dom';
import { useStudyProfile, usePlan } from '@/hooks/usePlan';
```

- [ ] **Step 3: Inside the Dashboard component body, read the new state**

Add at the top of the function body (after existing `useAppStore` selectors):

```tsx
const studyProfile = useStudyProfile();
const plan = usePlan();
const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
const profileBannerDismissed = useAppStore((s) => s.profileBannerDismissed);
const dismissProfileBanner = useAppStore((s) => s.dismissProfileBanner);
const showProfileBanner =
  hasCompletedOnboarding && !studyProfile && !profileBannerDismissed;
```

- [ ] **Step 4: Render the banner at the top of the dashboard JSX**

Just inside the `.sec` wrapper, before the existing hero, add:

```tsx
{showProfileBanner && (
  <div className="c zeig dash-banner">
    <div>
      <strong>{t('dashboard.profileBanner.title')}</strong>
      <p>{t('dashboard.profileBanner.desc')}</p>
    </div>
    <div className="dash-banner-actions">
      <Link to="/perfil" className="bp">
        {t('dashboard.profileBanner.cta')}
      </Link>
      <button className="bs" onClick={dismissProfileBanner}>
        {t('dashboard.profileBanner.dismiss')}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 5: Render Today's plan widget**

After the hero, before existing tasks block, add:

```tsx
{plan && (
  <div className="c zeig dash-today-plan">
    <h3>{t('dashboard.todayPlan')}</h3>
    <ul className="dash-plan-blocks">
      {plan.dailyTemplate.map((b) => (
        <li key={b.order}>
          <Link to={`/${b.module}`} className="mc dash-plan-block">
            <span>{b.minutes} min</span>
            <strong>{t(`nav.${b.module}`)}</strong>
          </Link>
        </li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 6: Render Recommended modules row**

Below Today's plan, add:

```tsx
{plan && (
  <div className="g3 dash-recs">
    {plan.modules.slice(0, 3).map((m) => (
      <Link key={m.module} to={`/${m.module}`} className="mc">
        <strong>{t(`nav.${m.module}`)}</strong>
        <span>{t(m.reasonKey)}</span>
      </Link>
    ))}
  </div>
)}
```

- [ ] **Step 6b: Personalize hero copy when profile present**

Find the existing hero `<h1>` or top heading in `Dashboard.tsx`. Replace its text with a conditional:

```tsx
<h1>
  {studyProfile
    ? t('dashboard.heroPersonal', {
        minutes: studyProfile.dailyMinutes,
        goal: t(`onboarding.options.goal.${studyProfile.goal}.title`),
      })
    : t('dashboard.heroDesc')}
</h1>
```

If the existing hero uses `t('dashboard.heroDesc')` as a `<p>` description (not the title), apply the same conditional swap there. Keep all surrounding markup unchanged — only the text content branches.

- [ ] **Step 7: Append CSS in `src/styles/index.css`**

```css
.dash-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.dash-banner-actions {
  display: flex;
  gap: 8px;
}
.dash-today-plan {
  margin-bottom: 16px;
}
.dash-plan-blocks {
  list-style: none;
  display: flex;
  gap: 12px;
  padding: 0;
  margin: 12px 0 0;
  flex-wrap: wrap;
}
.dash-plan-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px 16px;
  min-width: 120px;
}
.dash-plan-block span {
  font-size: 12px;
  color: var(--tm);
  text-transform: uppercase;
}
.dash-recs {
  margin-bottom: 16px;
}
```

- [ ] **Step 8: Run dev server, manually verify**

Run: `npm run dev`. Open browser. With `studyProfile` set (complete wizard), banner is hidden, Today's plan + Recs render.
Set `studyProfile=null, hasCompletedOnboarding=true, profileBannerDismissed=false` via DevTools (`useAppStore.setState({ studyProfile: null, hasCompletedOnboarding: true })`) → reload — banner shows. Click "Ara no" → banner gone, persists across reload.

- [ ] **Step 9: Commit**

```bash
git add src/features/dashboard/Dashboard.tsx src/styles/index.css
git commit -m "feat(dashboard): add profile banner + today's plan + recommended modules"
```

---

## Task 14: `/perfil` route

**Files:**
- Create: `src/features/profile/Profile.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/features/profile/Profile.tsx`**

```tsx
import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useStudyProfile } from '@/hooks/usePlan';
import { showToast } from '@/components/ui/Toast';
import type {
  StudyProfile,
  StudyGoal,
  AcademicLevel,
  StudyMethod,
  Obstacle,
  SessionLength,
  PreferredStudyTime,
  SelfRetention,
} from '@/types';

const GOALS: StudyGoal[] = ['exam', 'language', 'cert', 'university', 'other'];
const LEVELS: AcademicLevel[] = ['eso', 'batx', 'uni', 'oposicio', 'other'];
const METHODS: StudyMethod[] = ['read', 'manual', 'digital', 'mixed'];
const OBSTACLES: Obstacle[] = ['memory', 'time', 'focus', 'motivation', 'comprehension'];
const MINUTES: SessionLength[] = [15, 30, 60, 90];
const TIMES: PreferredStudyTime[] = ['morning', 'afternoon', 'evening', 'night', 'flexible'];
const RETENTIONS: SelfRetention[] = [1, 2, 3, 4, 5];

export function Profile(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useStudyProfile();
  const setStudyProfile = useAppStore((s) => s.setStudyProfile);

  const empty: StudyProfile = {
    goal: 'exam',
    level: 'uni',
    subjects: [],
    method: 'mixed',
    obstacle: 'memory',
    dailyMinutes: 30,
    preferredTime: 'evening',
    selfRetention: 3,
    examDate: null,
    completedAt: new Date().toISOString(),
    version: 1,
  };

  const [draft, setDraft] = useState<StudyProfile>(profile ?? empty);
  const [subjectInput, setSubjectInput] = useState('');

  const set = <K extends keyof StudyProfile>(k: K, v: StudyProfile[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const addSubject = () => {
    const v = subjectInput.trim();
    if (!v || draft.subjects.includes(v) || draft.subjects.length >= 5) return;
    set('subjects', [...draft.subjects, v]);
    setSubjectInput('');
  };

  const onSave = () => {
    setStudyProfile({ ...draft, completedAt: new Date().toISOString() });
    showToast({ title: '✅', desc: t('profile.saved') });
    navigate('/plan');
  };

  return (
    <section className="sec">
      <header className="sec-hdr">
        <h2>{t('profile.title')}</h2>
      </header>

      <div className="c profile-form">
        <label className="lbl">{t('onboarding.steps.goal.title')}</label>
        <select className="inp" value={draft.goal} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('goal', e.target.value as StudyGoal)}>
          {GOALS.map((g) => <option key={g} value={g}>{t(`onboarding.options.goal.${g}.title`)}</option>)}
        </select>

        <label className="lbl">{t('onboarding.steps.level.title')}</label>
        <select className="inp" value={draft.level} onChange={(e) => set('level', e.target.value as AcademicLevel)}>
          {LEVELS.map((l) => <option key={l} value={l}>{t(`onboarding.options.level.${l}.title`)}</option>)}
        </select>

        <label className="lbl">{t('onboarding.steps.subjects.title')}</label>
        <div className="ob-tags">
          {draft.subjects.map((s) => (
            <button key={s} className="tag" onClick={() => set('subjects', draft.subjects.filter((x) => x !== s))}>{s} ×</button>
          ))}
        </div>
        <input
          className="inp"
          value={subjectInput}
          placeholder={t('onboarding.steps.subjects.placeholder')}
          onChange={(e) => setSubjectInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
        />

        <label className="lbl">{t('onboarding.steps.method.title')}</label>
        <select className="inp" value={draft.method} onChange={(e) => set('method', e.target.value as StudyMethod)}>
          {METHODS.map((m) => <option key={m} value={m}>{t(`onboarding.options.method.${m}.title`)}</option>)}
        </select>

        <label className="lbl">{t('onboarding.steps.minutes.title')}</label>
        <select className="inp" value={draft.dailyMinutes} onChange={(e) => set('dailyMinutes', Number(e.target.value) as SessionLength)}>
          {MINUTES.map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>

        <label className="lbl">{t('onboarding.steps.time.title')}</label>
        <select className="inp" value={draft.preferredTime} onChange={(e) => set('preferredTime', e.target.value as PreferredStudyTime)}>
          {TIMES.map((tt) => <option key={tt} value={tt}>{t(`onboarding.options.time.${tt}.title`)}</option>)}
        </select>

        <label className="lbl">{t('onboarding.steps.obstacle.title')}</label>
        <select className="inp" value={draft.obstacle} onChange={(e) => set('obstacle', e.target.value as Obstacle)}>
          {OBSTACLES.map((o) => <option key={o} value={o}>{t(`onboarding.options.obstacle.${o}.title`)}</option>)}
        </select>

        <label className="lbl">{t('onboarding.steps.retention.title')}</label>
        <select className="inp" value={draft.selfRetention} onChange={(e) => set('selfRetention', Number(e.target.value) as SelfRetention)}>
          {RETENTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label className="lbl">{t('onboarding.steps.examDate.title')}</label>
        <input
          className="inp"
          type="date"
          value={draft.examDate ?? ''}
          onChange={(e) => set('examDate', e.target.value || null)}
        />

        <div className="ob-actions">
          <button className="bs" onClick={() => navigate('/plan')}>← {t('common.back')}</button>
          <button className="bp" onClick={onSave}>{t('profile.save')}</button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add lazy route in `src/App.tsx`**

Inside the `lazy(...)` block, add:

```tsx
const Profile = lazy(() =>
  import('@/features/profile/Profile').then((m) => ({ default: m.Profile })),
);
```

Inside the `<Routes>`, add:

```tsx
<Route path="/perfil" element={<Profile />} />
```

- [ ] **Step 3: Add `.profile-form` CSS**

`src/styles/index.css`:

```css
.profile-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.profile-form .lbl {
  margin-top: 12px;
}
```

- [ ] **Step 4: Verify** by visiting `/perfil` in dev. Edit fields → save → toast → redirected to `/plan`. State persists in IndexedDB.

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/Profile.tsx src/App.tsx src/styles/index.css
git commit -m "feat(profile): add /perfil route with editable StudyProfile form"
```

---

## Task 15: `/plan` route

**Files:**
- Create: `src/features/plan/Plan.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/features/plan/Plan.tsx`**

```tsx
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStudyProfile, usePlan, useImprovement } from '@/hooks/usePlan';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';
import { generatePlanNarrative } from '@/lib/planAI';
import { showToast } from '@/components/ui/Toast';

export function Plan(): JSX.Element {
  const { t, i18n } = useTranslation();
  const profile = useStudyProfile();
  const plan = usePlan();
  const improvement = useImprovement();
  const planNarrative = useAppStore((s) => s.planNarrative);
  const setPlanNarrative = useAppStore((s) => s.setPlanNarrative);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!profile || !plan || !improvement) {
    return <Navigate to="/perfil" replace />;
  }

  const onGenerate = async () => {
    setLoadingAi(true);
    try {
      const text = await generatePlanNarrative(profile, plan, i18n.language);
      setPlanNarrative(text);
    } catch (err) {
      showToast({ title: '⚠️', desc: String(err instanceof Error ? err.message : err) });
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <section className="sec">
      <header className="sec-hdr">
        <h2>{t('plan.title')}</h2>
        <p>{t('plan.weeklyMinutes', { min: plan.weeklyMinutes })}</p>
      </header>

      <div className="c zeig plan-improvement">
        <div className="ob-stat-big">+{improvement.delta}%</div>
        <div className="lbl">{t('onboarding.results.deltaLabel')}</div>
        <ul className="ob-breakdown-list">
          <li><span>{t('improvement.factors.baseline')}</span><strong>{improvement.baseline}%</strong></li>
          {improvement.factors.map((f) => (
            <li key={f.key}>
              <span>{t(f.labelKey)}</span>
              <strong className="ok">+{f.delta}%</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="c plan-modules">
        {(
          [
            { pri: 'essential' as const, key: 'plan.modulesEssential' },
            { pri: 'recommended' as const, key: 'plan.modulesRecommended' },
            { pri: 'optional' as const, key: 'plan.modulesOptional' },
          ]
        ).map(({ pri, key }) => {
          const mods = plan.modules.filter((m) => m.priority === pri);
          if (mods.length === 0) return null;
          return (
            <div key={pri} className="plan-module-group">
              <h3>{t(key)}</h3>
              <div className="g3">
                {mods.map((m) => (
                  <Link key={m.module} to={`/${m.module}`} className="mc">
                    <strong>{t(`nav.${m.module}`)}</strong>
                    <span>{t(m.reasonKey)}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="c plan-daily">
        <h3>{t('plan.dailyTemplate')}</h3>
        <div className="g3">
          {plan.dailyTemplate.map((b) => (
            <div key={b.order} className="mc">
              <strong>{t(`nav.${b.module}`)}</strong>
              <span>{b.minutes} min</span>
            </div>
          ))}
        </div>
      </div>

      <div className="c plan-milestones">
        <h3>{t('plan.milestones.title')}</h3>
        <ul>
          {plan.milestones.map((m) => (
            <li key={m.whenISO}>
              <strong>{m.whenISO}</strong> · {t(m.goalKey)} · {m.target}
            </li>
          ))}
        </ul>
      </div>

      <div className="c plan-narrative">
        <h3>{t('plan.narrative.title')}</h3>
        {planNarrative ? (
          <p style={{ whiteSpace: 'pre-line' }}>{planNarrative}</p>
        ) : (
          <button className="bp" onClick={onGenerate} disabled={loadingAi}>
            {loadingAi ? '...' : t('plan.narrative.generate')}
          </button>
        )}
        {planNarrative && (
          <button className="bs" onClick={onGenerate} disabled={loadingAi}>
            {t('plan.narrative.regenerate')}
          </button>
        )}
      </div>

      <div className="ob-actions">
        <Link to="/perfil" className="bs">{t('plan.edit')}</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add lazy route in `src/App.tsx`**

```tsx
const Plan = lazy(() =>
  import('@/features/plan/Plan').then((m) => ({ default: m.Plan })),
);
```

Inside `<Routes>`:

```tsx
<Route path="/plan" element={<Plan />} />
```

- [ ] **Step 3: Add CSS**

```css
.plan-improvement,
.plan-modules,
.plan-daily,
.plan-milestones,
.plan-narrative {
  padding: 20px;
  margin-bottom: 16px;
}
.plan-module-group { margin-bottom: 16px; }
.plan-milestones ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.plan-milestones li {
  padding: 8px 0;
  border-bottom: 1px solid var(--bl);
  color: var(--ts);
}
.plan-milestones li:last-child { border-bottom: none; }
.ob-breakdown-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}
.ob-breakdown-list li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--bl);
  color: var(--ts);
  font-size: 14px;
}
```

- [ ] **Step 4: Verify** by visiting `/plan` after completing wizard. All sections render.

- [ ] **Step 5: Commit**

```bash
git add src/features/plan/Plan.tsx src/App.tsx src/styles/index.css
git commit -m "feat(plan): add /plan route with improvement breakdown, modules, milestones, narrative slot"
```

---

## Task 16: Sidebar nav entry for Plan

**Files:**
- Modify: `src/components/Layout/Sidebar.tsx`

- [ ] **Step 1: Add `Plan` to `SECONDARY_NAV` array (line 53)**

Replace the array with:

```tsx
const SECONDARY_NAV: readonly NavItem[] = [
  { tab: 'exams', Icon: Calendar },
  { tab: 'plan', Icon: Sparkles },
  { tab: 'stats', Icon: BarChart3 },
  { tab: 'social', Icon: Users },
  { tab: 'cloud', Icon: Cloud },
];
```

- [ ] **Step 2: Add `Sparkles` to the lucide import (line 6-23)**

Add `Sparkles,` to the import list.

- [ ] **Step 3: Update `renderItem` route mapping (line 141)**

Current code maps `dashboard → /`, every other tab → `/<tab>`. The `/perfil` route uses Catalan slug; the nav entry for `profile` is not in PRIMARY/SECONDARY/TERTIARY nav (only reachable from /plan + banner). For `plan` tab, the slug matches: `/plan`. No change needed to the mapping logic.

- [ ] **Step 4: Verify dev server** — sidebar shows the Plan entry between Exams and Stats. Click navigates to `/plan`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/Sidebar.tsx
git commit -m "feat(nav): add Plan entry to sidebar"
```

---

## Task 17: Worker `/generate-plan` endpoint

**Files:**
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Read current `worker/src/index.ts`** to see existing route pattern.

Run: `cat worker/src/index.ts`. Find how `/feynman` is implemented — copy the pattern (CORS, rate limit, Gemini call shape).

- [ ] **Step 2: Add a new `POST /generate-plan` handler**

Add a new branch in the request router (mirroring `/feynman`). Body shape:
```ts
{
  profile: StudyProfile,  // shape per src/types/index.ts
  plan: StudyPlan,        // shape per src/types/index.ts
  locale: string,         // 'ca' | 'en' | 'es'
}
```

Prompt template:

```
You are a study coach writing in {{locale}}.
Write a 2-3 paragraph motivational and actionable narrative for this learner's plan.
Be concrete, reference their goal, obstacle, and the top recommended modules.
DO NOT repeat the raw numbers — focus on what to do next.

Profile: {{JSON.stringify(profile)}}
Plan: {{JSON.stringify(plan)}}

Return plain text only, no markdown headings.
```

Response shape:
```json
{ "narrative": "..." }
```

Use the same Gemini 2.5-flash model as `/feynman`. Same CORS headers. Same rate limit logic.

- [ ] **Step 3: Deploy worker locally to test**

Run: `cd worker && npx wrangler dev`
Expected: server starts on `http://localhost:8787`.

- [ ] **Step 4: Smoke test endpoint**

In another terminal:

```bash
curl -X POST http://localhost:8787/generate-plan \
  -H 'Content-Type: application/json' \
  -d '{"profile":{"goal":"exam","level":"uni","subjects":["Anatomia"],"method":"read","obstacle":"memory","dailyMinutes":30,"preferredTime":"evening","selfRetention":3,"examDate":null,"completedAt":"2026-04-27T10:00:00.000Z","version":1},"plan":{"weeklyMinutes":210,"modules":[{"module":"cards","priority":"essential","reasonKey":"plan.reasons.cardsMemory"}],"dailyTemplate":[{"order":1,"module":"cards","minutes":30}],"milestones":[]},"locale":"ca"}'
```

Expected: 200 with `{"narrative":"..."}` containing Catalan motivational text.

- [ ] **Step 5: Deploy worker to Cloudflare**

Run: `cd worker && npx wrangler deploy`
Expected: deployed successfully.

- [ ] **Step 6: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat(worker): add POST /generate-plan endpoint for AI narrative refine"
```

---

## Task 18: Frontend AI client `planAI.ts`

**Files:**
- Create: `src/lib/planAI.ts`

- [ ] **Step 1: Create the file**

```ts
import type { StudyProfile, StudyPlan } from '@/types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export async function generatePlanNarrative(
  profile: StudyProfile,
  plan: StudyPlan,
  locale: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${WORKER_URL}/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, plan, locale }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('RATE_LIMIT');
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as { narrative?: string };
  if (!data.narrative) throw new Error('Invalid response from AI proxy');
  return data.narrative;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/planAI.ts
git commit -m "feat(lib): add planAI client for /generate-plan worker endpoint"
```

---

## Task 19: End-to-end smoke test + final verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all `improvement` and `plan` tests PASS, plus existing `activeExam` tests.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 4: Manual smoke matrix** — start dev server (`npm run dev`)

Verify each scenario:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Clear IndexedDB, reload `/` | Wizard appears (9 Qs across 3 phases) |
| 2 | Complete wizard with goal=exam | examDate step appears |
| 3 | Complete wizard with goal=other | examDate step skipped |
| 4 | Reach Results step | Big % delta, breakdown rows match heuristic, 3 module chips |
| 5 | Click "Veure pla complet" | Navigates to `/plan`, all sections render |
| 6 | Click "Editar perfil" on /plan | Navigates to `/perfil`, fields prefilled |
| 7 | Edit obstacle in /perfil to `focus`, save | Toast appears, redirect /plan, modules updated (timer essential) |
| 8 | Reload after wizard | StudyProfile persisted, no wizard re-shown |
| 9 | DevTools → set `studyProfile=null, hasCompletedOnboarding=true` → reload | Banner appears on Dashboard |
| 10 | Click "Ara no" on banner | Banner gone; reload → still gone |
| 11 | Switch locale to `en`, then `es` | All wizard/plan/profile/banner strings translated |
| 12 | `/plan` → click "Personalitzar amb IA" (worker running) | Narrative appears, persists across reload |
| 13 | Toggle airplane mode, reload | Wizard, /plan, Dashboard work; AI button shows error toast |

- [ ] **Step 5: Deploy preview**

Run: `npx wrangler pages deploy dist --project-name estudia`
Expected: URL like `https://<hash>.estudia.pages.dev` returned.

- [ ] **Step 6: Smoke test deployed URL** in private browser tab — repeat scenarios 1, 4, 5, 11.

- [ ] **Step 7: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "feat(onboarding): complete personalized onboarding + study plan release"
```

---

## Out of Scope (Future Iterations)

- Supabase persistence of profile (cloud sync handled by existing CloudSync if user opts in; profile rides on the existing AppState sync path)
- Adaptive plan re-evaluation based on usage stats (cards reviewed vs target, etc.)
- Benchmark comparison ("students like you average X%")
- Server-side caching of AI narrative
- BottomNav entry for Plan (mobile already at 5 tabs; revisit when removing one)
- Migration banner copy A/B testing
