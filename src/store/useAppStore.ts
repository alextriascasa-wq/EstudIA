import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, DailyLogEntry, ConvMessage, LangCard, ConvSession } from '@/types';
import { DEFAULT_STATE, STATE_KEY } from './defaults';
import { createIdbStorage } from './persist';
import { mergeLegacy, readLegacyLocalStorage } from './migration';
import { today, uid } from '@/lib/date';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { XP_TABLE } from '@/lib/xp';
import { showToast } from '@/components/ui/Toast';
import { showXPPopup } from '@/components/ui/XPPopup';

let _isChecking = false;

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
  /** Increment daily metrics (minutes, cards, sessions, etc.). */
  incrementDailyLog: (data: Partial<Omit<DailyLogEntry, 'date'>>) => void;
  /** Start a new ConvIA session, returns the session id. */
  startConvSession: (langDeckId: string, scenarioId: string) => string;
  /** Append a message to a ConvIA session. */
  addConvMessage: (sessionId: string, message: ConvMessage) => void;
  /** Mark a ConvIA session as ended with a final fluency score. */
  endConvSession: (sessionId: string, fluencyScore: number) => void;
  /** Add vocab cards from corrections to the linked lang deck. */
  queueConvCards: (sessionId: string, cards: Pick<LangCard, 'word' | 'translation' | 'example'>[]) => void;
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
        if (_isChecking) return [];
        const s = get();
        const unlocked: string[] = [];
        ACHIEVEMENTS.forEach((a) => {
          if (!s.achievements.includes(a.id) && a.check(s)) {
            unlocked.push(a.id);
          }
        });

        if (unlocked.length > 0) {
          _isChecking = true;
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
            get().addXP(50);
          });
          _isChecking = false;
        }
        return unlocked;
      },

      rolloverIfNeeded: () => {
        const prev = get();
        const t = today();
        if (prev.lastDate && prev.lastDate !== t) {
          const lastDateObj = new Date(prev.lastDate);
          const todayObj = new Date(t);
          const diffDays = Math.floor(
            (todayObj.getTime() - lastDateObj.getTime()) / 864e5
          );

          set((s) => {
            let { streak, weekly, todaySess, cardsToday } = s;
            
            // Streak logic: 
            // If diff is 1 and we studied on lastDate (todaySess > 0 before reset), we increment.
            // If diff > 1, we lost the streak (reset to 1 or 0). 
            if (diffDays === 1) {
              if (s.todaySess === 0) streak = 1; 
              else streak++;
            } else if (diffDays > 1) {
              streak = 1;
            }
            
            todaySess = 0;
            cardsToday = 0;
            
            // Weekly reset on Monday
            const dow = new Date().getDay(); // 0=Sun, 1=Mon
            if (dow === 1 && diffDays >= 1) {
              weekly = DEFAULT_STATE.weekly.map((w) => ({ ...w }));
            }
            
            return { streak, weekly, todaySess, cardsToday, lastDate: t };
          });
          get().save();
        } else if (!prev.lastDate) {
          set({ lastDate: t });
          get().save();
        }
      },

      incrementDailyLog: (data) => {
        const t = today();
        set((prev) => {
          const dailyLog = [...prev.dailyLog];
          let entry = dailyLog.find((d) => d.date === t);
          if (!entry) {
            entry = { date: t, minutes: 0, cards: 0, correct: 0, sessions: 0 };
            dailyLog.push(entry);
          }

          let { heatmap, quizTotal, quizCorrect, cardsToday, totalMin, todaySess, pomCount } = prev;
          
          if (data.minutes) {
            entry.minutes += data.minutes;
            totalMin += data.minutes;
            heatmap = { ...heatmap, [t] : (heatmap[t] || 0) + data.minutes };
          }
          
          if (data.cards) {
            entry.cards += data.cards;
            quizTotal += data.cards;
            cardsToday += data.cards;
          }
          
          if (data.correct) {
            entry.correct += data.correct;
            quizCorrect += data.correct;
          }
          
          if (data.sessions) {
            entry.sessions += data.sessions;
            todaySess += data.sessions;
          }

          if ((data as any).pomodoros) {
            pomCount += (data as any).pomodoros;
          }

          const memStrength = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0;

          return { dailyLog, heatmap, quizTotal, quizCorrect, cardsToday, memStrength, totalMin, todaySess, pomCount };
        });
        get().save();
      },

      startConvSession: (langDeckId, scenarioId) => {
        const deck = get().langDecks.find((d) => d.id === langDeckId);
        const language = deck?.lang ?? 'en';
        const id = uid();
        const session: ConvSession = {
          id,
          langDeckId,
          scenarioId,
          language,
          messages: [],
          fluencyScore: 0,
          newCards: 0,
          startedAt: new Date().toISOString(),
          endedAt: null,
        };
        set((prev) => ({ convSessions: [...prev.convSessions, session] }));
        return id;
      },

      addConvMessage: (sessionId, message) => {
        set((prev) => ({
          convSessions: prev.convSessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, message] }
              : s,
          ),
        }));
      },

      endConvSession: (sessionId, fluencyScore) => {
        set((prev) => ({
          convSessions: prev.convSessions.map((s) =>
            s.id === sessionId
              ? { ...s, fluencyScore, endedAt: new Date().toISOString() }
              : s,
          ),
        }));
        get().save();
      },

      queueConvCards: (sessionId, cards) => {
        const session = get().convSessions.find((s) => s.id === sessionId);
        if (!session) return;
        const newLangCards: LangCard[] = cards.map((c) => ({
          id: uid(),
          word: c.word,
          translation: c.translation,
          example: c.example,
          hits: 0,
          sessionHits: 0,
          nextReview: today(),
          interval: 1,
          strength: 0,
        }));
        const newLangDecks = get().langDecks.map((d) =>
          d.id === session.langDeckId
            ? { ...d, cards: [...d.cards, ...newLangCards] }
            : d,
        );
        set((prev) => ({
          langDecks: newLangDecks,
          convSessions: prev.convSessions.map((s) =>
            s.id === sessionId
              ? { ...s, newCards: s.newCards + cards.length }
              : s,
          ),
        }));
        get().save();
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
        league: s.league,
        zeroSessions: s.zeroSessions,
        convSessions: s.convSessions,
      }),
    },
  ),
);
