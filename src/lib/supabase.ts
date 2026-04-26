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

// ─── Social helpers ───────────────────────────────────────────────────────────

/** Search for a user profile by email prefix (username) or exact email. */
export const searchUserByEmail = (email: string) =>
  supabase
    .from('profiles')
    .select('id, username, avatar_url, xp, streak, is_public')
    .or(`username.eq.${email.split('@')[0]},email.eq.${email}`)
    .limit(5);

/** Fetch all friendships for the current user (both directions). */
export const fetchFriendships = (userId: string) =>
  supabase
    .from('friendships')
    .select(`
      id, user_id, friend_id, status, created_at,
      friend:profiles!friend_id(id, username, avatar_url, xp, streak, is_public)
    `)
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .order('created_at', { ascending: false });

/** Send a friend request. */
export const sendFriendRequest = (userId: string, friendId: string) =>
  supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
    .select()
    .single();

/** Accept or block a friendship. */
export const respondFriendRequest = (
  friendshipId: string,
  status: 'accepted' | 'blocked',
) =>
  supabase
    .from('friendships')
    .update({ status })
    .eq('id', friendshipId)
    .select()
    .single();

/** Delete a friendship row. */
export const removeFriend = (friendshipId: string) =>
  supabase.from('friendships').delete().eq('id', friendshipId);

/** Fetch activity feed for a set of friend user IDs. */
export const fetchFeed = (friendIds: string[]) => {
  if (friendIds.length === 0) return Promise.resolve({ data: [] as unknown[], error: null });
  return supabase
    .from('activity_events')
    .select(`
      id, user_id, type, payload, created_at,
      user:profiles!user_id(id, username, avatar_url, xp, streak, is_public)
    `)
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(50);
};

/** Publish an activity event for the current user. */
export const publishActivity = (
  userId: string,
  type: string,
  payload: Record<string, unknown>,
) =>
  supabase.from('activity_events').insert({ user_id: userId, type, payload });

/** Fetch all challenges involving the current user. */
export const fetchChallenges = (userId: string) =>
  supabase
    .from('challenges')
    .select(`
      id, creator_id, opponent_id, type, params, status, result, created_at, ends_at,
      creator:profiles!creator_id(id, username, avatar_url, xp, streak, is_public),
      opponent:profiles!opponent_id(id, username, avatar_url, xp, streak, is_public)
    `)
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false });

/** Create a new challenge. */
export const createChallenge = (
  creatorId: string,
  opponentId: string,
  type: string,
  params: Record<string, unknown>,
  endsAt: string,
) =>
  supabase
    .from('challenges')
    .insert({ creator_id: creatorId, opponent_id: opponentId, type, params, ends_at: endsAt })
    .select()
    .single();

/** Accept, decline, or complete a challenge. */
export const respondChallenge = (
  challengeId: string,
  status: 'accepted' | 'declined' | 'completed',
  result?: Record<string, unknown>,
) =>
  supabase
    .from('challenges')
    .update({ status, ...(result ? { result } : {}) })
    .eq('id', challengeId)
    .select()
    .single();
