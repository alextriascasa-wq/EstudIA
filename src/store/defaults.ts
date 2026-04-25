import type { AppState } from '@/types';

/** Pro storage key — we read this once on cold boot to migrate legacy data. */
export const LEGACY_LOCALSTORAGE_KEY = 'sfpro';
export const LEGACY_DARK_KEY = 'sfpro-dark';

/** New storage key (IndexedDB via idb-keyval). */
export const STATE_KEY = 'studyflow-state-v2';
export const THEME_KEY = 'studyflow-theme-v2';

export const DEFAULT_STATE: AppState = {
  todaySess: 0,
  totalMin: 0,
  streak: 1,
  lastDate: null,
  hasCompletedOnboarding: false,
  pomCount: 0,
  weekly: [
    { d: 'Dl', m: 0 },
    { d: 'Dt', m: 0 },
    { d: 'Dc', m: 0 },
    { d: 'Dj', m: 0 },
    { d: 'Dv', m: 0 },
    { d: 'Ds', m: 0 },
    { d: 'Dg', m: 0 },
  ],
  exams: [],
  quizzes: [],
  decks: [],
  doneTasks: [],
  zNote: '',
  feynmanHistory: [],
  memStrength: 0,
  quizTotal: 0,
  quizCorrect: 0,
  cardsToday: 0,
  xp: 0,
  level: 1,
  totalXp: 0,
  achievements: [],
  heatmap: {},
  langDecks: [],
  soundPrefs: { rain: 0, cafe: 0, fire: 0, forest: 0, waves: 0, brown: 0 },
  dailyLog: [],
  friends: [],
  sharedResources: [],
  friendCode: `SF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  league: 'Bronze',
  zeroSessions: [],
  convSessions: [],
  activeExam: null,
};
