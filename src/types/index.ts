/**
 * StudyFlow Pro — Type definitions
 *
 * Mirror of the legacy `sfpro` localStorage shape so automatic migration is loss-free.
 * Names are kept in English; user-facing strings in Catalan live in the UI layer.
 */
import type { Card as FSRSCard } from 'ts-fsrs';
import type { User, Session } from '@supabase/supabase-js';

// ─── Auth / Cloud Sync ────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

/** Ephemeral auth state — stored in AppStore but NOT persisted to IndexedDB. */
export interface AuthState {
  user: User | null;
  session: Session | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null; // ISO 8601
}

export type Weekday = 'Dl' | 'Dt' | 'Dc' | 'Dj' | 'Dv' | 'Ds' | 'Dg';

export interface WeeklySlot {
  d: Weekday;
  m: number;
}

export type ExamDifficulty = 'fàcil' | 'mitjà' | 'difícil';

export interface Exam {
  id: string;
  name: string;
  subject: string;
  date: string; // ISO yyyy-mm-dd
  difficulty: ExamDifficulty;
}

export type QuizType = 'test' | 'tf' | 'open' | 'practical';

export type ZeroSubjectMode = 'stem' | 'humanities';

export interface ZeroSessionResult {
  id: string;
  date: string; // ISO yyyy-mm-dd
  topic: string;
  mode: ZeroSubjectMode;
  score: number;
  gaps: string[];
}

export interface StemSession {
  topic: string;
  concept: string;
  workedExample: {
    problem: string;
    steps: string[];
    answer: string;
  };
  practiceProblems: Array<{
    problem: string;
    answer: string;
    hints: string[];
  }>;
}

export interface HumanitiesSession {
  topic: string;
  conceptMap: {
    themes: string[];
    keyFigures: Array<{ name: string; role: string }>;
    timeline?: string[];
    keyQuotes?: string[];
  };
  recallQuestions: Array<{
    question: string;
    idealAnswer: string;
    rubric: string[];
  }>;
}

export interface QuizQuestion {
  id: string;
  q: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  feedback?: string;
  isCorrect?: boolean;
}

export interface ActiveExamState {
  topic: string;
  type: QuizType;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  currentIdx: number;
  startedAt: string; // ISO timestamp — lets UI show "resumed from X"
}

export interface Quiz {
  id: string;
  topic: string;
  type: QuizType;
  date: string;
  score: number;
  questions: QuizQuestion[];
}

export interface Flashcard {
  id: string;
  q: string;
  a: string;
  subject: string;
  hits: number;
  sessionHits: number;
  nextReview: string;
  strength: number;
  interval: number;
  lastSeen: string | null;
  fsrsData?: FSRSCard;
}

export interface Deck {
  id: string;
  name: string;
  cards: Flashcard[];
}

export interface FeynmanMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp?: string;
  source?: 'ai' | 'fallback';
}

export interface LangCard {
  id: string;
  word: string;
  translation: string;
  example: string;
  hits: number;
  sessionHits: number;
  nextReview: string;
  interval: number;
  strength: number;
}

export interface LangDeck {
  id: string;
  name: string;
  lang: string;
  cards: LangCard[];
}

export interface Scenario {
  id: string;
  emoji: string;
  titleKey: string; // i18n key, e.g. 'conv.scenarios.cafe'
  character: string; // e.g. 'barista'
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ConvCorrection {
  original: string;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'fluency';
}

export interface ConvMessage {
  role: 'user' | 'ai';
  text: string;
  corrections: ConvCorrection[]; // empty array for AI messages
}

export interface ConvSession {
  id: string;
  langDeckId: string; // links to existing LangDeck
  scenarioId: string;
  language: string; // e.g. 'en', 'fr'
  messages: ConvMessage[];
  fluencyScore: number; // 0–100, updated each turn
  newCards: number; // total vocab cards queued this session
  startedAt: string; // ISO date string
  endedAt: string | null;
}

export type SoundKey = 'rain' | 'cafe' | 'fire' | 'forest' | 'waves' | 'brown';

export type SoundPrefs = Record<SoundKey, number>;

export interface DailyLogEntry {
  date: string;
  minutes: number;
  cards: number;
  correct: number;
  sessions: number;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  level: number;
  totalXp: number;
  streak: number;
  weeklyMinutes: number;
  isOnline: boolean;
  league: string;
}

export interface SharedResource {
  id: string;
  type: 'deck' | 'quiz' | 'notes';
  name: string;
  fromFriend: string;
  fromName: string;
  date: string;
  data: unknown;
  accepted: boolean;
}

export interface AppState {
  todaySess: number;
  totalMin: number;
  streak: number;
  lastDate: string | null;
  hasCompletedOnboarding: boolean;
  pomCount: number;
  weekly: WeeklySlot[];
  exams: Exam[];
  quizzes: Quiz[];
  decks: Deck[];
  doneTasks: string[];
  zNote: string;
  feynmanHistory: FeynmanMessage[];
  memStrength: number;
  quizTotal: number;
  quizCorrect: number;
  cardsToday: number;
  /** Gamification */
  xp: number;
  level: number;
  totalXp: number;
  achievements: string[];
  /** Heatmap: date → minutes (last ~120 days) */
  heatmap: Record<string, number>;
  /** Language decks */
  langDecks: LangDeck[];
  /** Sound mixer preferences */
  soundPrefs: SoundPrefs;
  /** Daily log (stats) */
  dailyLog: DailyLogEntry[];
  /** Social Ecosystem */
  friends: Friend[];
  sharedResources: SharedResource[];
  friendCode: string;
  league: string;
  zeroSessions: ZeroSessionResult[];
  convSessions: ConvSession[];
  /** Active exam in progress. null when none running. Persisted across reload/tab switch. */
  activeExam: ActiveExamState | null;
  /** Personalized study profile captured in onboarding. null until completed. */
  studyProfile: StudyProfile | null;
  /** True after user dismisses the "complete your profile" banner once. */
  profileBannerDismissed: boolean;
  /** Optional AI-generated motivational narrative for /plan page. null until refined. */
  planNarrative: string | null;
}

export interface StudyTask {
  id: string;
  examName: string;
  subject: string;
  date: string;
  session: string;
  daysBefore: number;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  ico: string;
  check: (s: AppState) => boolean;
}

export interface TimerMode {
  id: 'pom' | 'd52' | 'd90' | 'd120';
  nm: string;
  w: number;
  r: number;
  lr?: number;
  ico: string;
  ds: string;
  ideal: string;
}

export type Theme = 'light' | 'dark';

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

// ─── Social / Friends ─────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  xp: number;
  streak: number;
  isPublic: boolean;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  friend?: UserProfile;
  createdAt: string;
}

export type ActivityEventType =
  | 'cards_completed'
  | 'streak_milestone'
  | 'exam_done'
  | 'challenge_won'
  | 'study_session';

export interface ActivityEvent {
  id: string;
  userId: string;
  type: ActivityEventType;
  payload: Record<string, unknown>;
  createdAt: string;
  user?: UserProfile;
}

export type ChallengeType = 'flashcards' | 'study_time' | 'exam';
export type ChallengeStatus = 'pending' | 'accepted' | 'active' | 'completed' | 'declined';

export interface Challenge {
  id: string;
  creatorId: string;
  opponentId: string;
  type: ChallengeType;
  params: { durationDays: number; targetCount: number; subject?: string };
  status: ChallengeStatus;
  result: { winnerId?: string; creatorScore: number; opponentScore: number } | null;
  createdAt: string;
  endsAt: string | null;
  creator?: UserProfile;
  opponent?: UserProfile;
}

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
