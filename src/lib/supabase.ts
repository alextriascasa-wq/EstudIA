import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export const signInWithMagicLink = (email: string) =>
  supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });

export const signInWithPassword = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

// ─── Sync helpers ─────────────────────────────────────────────────────────────

/**
 * Keys excluded from cloud sync:
 * - Store action functions
 * - Transient UI state (_toastQueue, _hasHydrated)
 * - Per-device prefs (soundPrefs, theme, language)
 * - Auth state itself (would be circular + insecure)
 */
const LOCAL_ONLY_KEYS = new Set([
  'setState', 'patch', 'save', 'addXP', 'checkAchievements',
  'rolloverIfNeeded', 'incrementDailyLog', 'setAuth', 'setSyncStatus',
  'startConvSession', 'addConvMessage', 'endConvSession', 'queueConvCards',
  '_toastQueue', '_hasHydrated',
  'authState', 'soundPrefs', 'theme', 'language',
]);

export const buildSyncPayload = (state: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (!LOCAL_ONLY_KEYS.has(k) && typeof v !== 'function') {
      out[k] = v;
    }
  }
  return out;
};

export const pushState = (userId: string, payload: Record<string, unknown>) =>
  supabase
    .from('profiles')
    .update({
      app_state: payload,
      state_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

export const pullState = (userId: string) =>
  supabase
    .from('profiles')
    .select('app_state, state_updated_at')
    .eq('id', userId)
    .single();
