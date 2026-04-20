import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from '@/types';
import { DEFAULT_STATE, STATE_KEY } from './defaults';
import { createIdbStorage } from './persist';
import { mergeLegacy, readLegacyLocalStorage } from './migration';
import { today } from '@/lib/date';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { XP_TABLE } from '@/lib/xp';
import { showToast } from '@/components/ui/Toast';
import { showXPPopup } from '@/components/ui/XPPopup';

type ToastKind = 'info' | 'level' | 'achievement';
export interface ToastInput {
  title: string;
  desc?: string;
  kind?: ToastKind;
}

export interface StoreActions {
  /** Replace the whole state (used by importData). */
  setState: (s: AppState) => void;
  /** Partial patch. */
  patch: (p: Partial<AppState>) => void;
  /** Persist the heatmap for today + cleanup old entries. Mirrors Pro `save()`. */
  save: () => void;
  /** Add XP + auto level-up + toast emission. Mirrors Pro `addXP`. */
  addXP: (amount: number) => { leveled: number[] };
  /** Evaluate every achievement and unlock newly-earned ones. Returns the unlocked list. */
  checkAchievements: () => string[];
  /** Compute day-rollover side effects (streak, weekly reset, per-day counters). Mirrors Pro boot logic. */
  rolloverIfNeeded: () => void;
}

export type AppStore = AppState & StoreActions & { _toastQueue: ToastInput[]; _hasHydrated: boolean };

/** Initial state, hydrated from legacy `sfpro` on first boot. */
const initialState: AppState = mergeLegacy(readLegacyLocalStorage());

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      _toastQueue: [],
      _hasHydrated: false,

      setState: (s) => set({ ...s }),

      patch: (p) => set((prev) => ({ ...prev, ...p })),

      save: () => {
        set((prev) => {
          const heatmap = { ...prev.heatmap };
          const t = today();
          if (heatmap[t] === undefined) heatmap[t] = 0;
          // Clean entries older than 120 days.
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 120);
          const cs = cutoff.toISOString().split('T')[0]!;
          Object.keys(heatmap).forEach((k) => {
            if (k < cs) delete heatmap[k];
          });
          return { lastDate: t, heatmap };
        });
      },

      addXP: (amount) => {
        const leveled: number[] = [];
        set((prev) => {
          let { xp, totalXp, level } = prev;
          xp += amount;
          totalXp += amount;
          while (level < 50 && totalXp >= (XP_TABLE[level] ?? Infinity)) {
            level++;
            leveled.push(level);
          }
          return { xp, totalXp, level };
        });
        get().save();
        showXPPopup(amount);
        leveled.forEach((lvl) => {
          showToast({
            title: `🎉 Nivell ${lvl}!`,
            desc: 'Has pujat de nivell! Continua així.',
            kind: 'level',
          });
        });
        // Recursive achievement check mirrors Pro.
        get().checkAchievements();
        return { leveled };
      },

      checkAchievements: () => {
        const unlocked: string[] = [];
        const current = get();
        ACHIEVEMENTS.forEach((a) => {
          if (!current.achievements.includes(a.id) && a.check(current)) {
            unlocked.push(a.id);
          }
        });
        if (unlocked.length > 0) {
          set((prev) => ({ achievements: [...prev.achievements, ...unlocked] }));
          unlocked.forEach((id) => {
            const ach = ACHIEVEMENTS.find((a) => a.id === id);
            if (ach) {
              showToast({
                title: `${ach.ico} ${ach.name}`,
                desc: ach.desc,
                kind: 'achievement',
              });
            }
            // +50 XP each, recursive (Pro behavior).
            get().addXP(50);
          });
        }
        return unlocked;
      },

      rolloverIfNeeded: () => {
        const prev = get();
        if (prev.lastDate && prev.lastDate !== today()) {
          const diffDays = Math.floor(
            (new Date(today()).getTime() - new Date(prev.lastDate).getTime()) / 864e5,
          );
          set((s) => {
            let { streak, weekly, todaySess, cardsToday } = s;
            if (diffDays === 1 && s.todaySess > 0) streak++;
            else if (diffDays > 1) streak = 1;
            todaySess = 0;
            cardsToday = 0;
            const dow = new Date().getDay();
            if (dow === 1 && diffDays >= 1) {
              weekly = DEFAULT_STATE.weekly.map((w) => ({ ...w }));
            }
            return { streak, weekly, todaySess, cardsToday };
          });
        }
      },
    }),
    {
      name: STATE_KEY,
      storage: createIdbStorage(),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ _hasHydrated: true });
      },
      // Only persist the AppState slice, not the transient toast queue / actions.
      partialize: (s): AppState => ({
        todaySess: s.todaySess,
        totalMin: s.totalMin,
        streak: s.streak,
        lastDate: s.lastDate,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        pomCount: s.pomCount,
        weekly: s.weekly,
        exams: s.exams,
        quizzes: s.quizzes,
        decks: s.decks,
        doneTasks: s.doneTasks,
        zNote: s.zNote,
        feynmanHistory: s.feynmanHistory,
        memStrength: s.memStrength,
        quizTotal: s.quizTotal,
        quizCorrect: s.quizCorrect,
        cardsToday: s.cardsToday,
        xp: s.xp,
        level: s.level,
        totalXp: s.totalXp,
        achievements: s.achievements,
        heatmap: s.heatmap,
        langDecks: s.langDecks,
        soundPrefs: s.soundPrefs,
        dailyLog: s.dailyLog,
        friends: s.friends,
        sharedResources: s.sharedResources,
        friendCode: s.friendCode,
      }),
    },
  ),
);
