import { useState, useEffect, useCallback } from 'react';
import { fetchChallenges, createChallenge, respondChallenge } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { Challenge, ChallengeType, ChallengeStatus } from '@/types';

interface RawProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  streak: number;
  is_public: boolean;
}

interface RawChallenge {
  id: string;
  creator_id: string;
  opponent_id: string;
  type: string;
  params: { durationDays: number; targetCount: number; subject?: string };
  status: string;
  result: { winnerId?: string; creatorScore: number; opponentScore: number } | null;
  created_at: string;
  ends_at: string | null;
  creator: RawProfile | null;
  opponent: RawProfile | null;
}

function mapProfile(p: RawProfile | null) {
  if (!p) return undefined;
  return {
    id: p.id,
    username: p.username,
    avatarUrl: p.avatar_url,
    xp: p.xp ?? 0,
    streak: p.streak ?? 0,
    isPublic: p.is_public ?? false,
  };
}

function mapChallenge(raw: RawChallenge): Challenge {
  return {
    id: raw.id,
    creatorId: raw.creator_id,
    opponentId: raw.opponent_id,
    type: raw.type as ChallengeType,
    params: raw.params ?? { durationDays: 7, targetCount: 50 },
    status: raw.status as ChallengeStatus,
    result: raw.result,
    createdAt: raw.created_at,
    endsAt: raw.ends_at,
    creator: mapProfile(raw.creator),
    opponent: mapProfile(raw.opponent),
  };
}

export interface UseChallengesReturn {
  challenges: Challenge[];
  active: Challenge[];
  pending: Challenge[];
  completed: Challenge[];
  loading: boolean;
  error: string | null;
  create: (
    opponentId: string,
    type: ChallengeType,
    params: { durationDays: number; targetCount: number; subject?: string },
  ) => Promise<void>;
  accept: (challengeId: string) => Promise<void>;
  decline: (challengeId: string) => Promise<void>;
  complete: (
    challengeId: string,
    result: { winnerId?: string; creatorScore: number; opponentScore: number },
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useChallenges(): UseChallengesReturn {
  const user = useAppStore((s) => s.authState.user);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setChallenges([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await fetchChallenges(user.id);
      if (err) throw err;
      setChallenges(((data ?? []) as unknown as RawChallenge[]).map(mapChallenge));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading challenges');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(
    async (
      opponentId: string,
      type: ChallengeType,
      params: { durationDays: number; targetCount: number; subject?: string },
    ) => {
      if (!user) return;
      const endsAt = new Date(
        Date.now() + params.durationDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      await createChallenge(
        user.id,
        opponentId,
        type,
        params as Record<string, unknown>,
        endsAt,
      );
      await load();
    },
    [user, load],
  );

  const accept = useCallback(async (id: string) => {
    await respondChallenge(id, 'accepted');
    await load();
  }, [load]);

  const decline = useCallback(async (id: string) => {
    await respondChallenge(id, 'declined');
    await load();
  }, [load]);

  const complete = useCallback(
    async (
      id: string,
      result: { winnerId?: string; creatorScore: number; opponentScore: number },
    ) => {
      await respondChallenge(id, 'completed', result as Record<string, unknown>);
      await load();
    },
    [load],
  );

  const active = challenges.filter(
    (c) => c.status === 'active' || c.status === 'accepted',
  );
  const pending = challenges.filter(
    (c) => c.status === 'pending' && c.creatorId !== user?.id,
  );
  const completed = challenges.filter(
    (c) => c.status === 'completed' || c.status === 'declined',
  );

  return {
    challenges, active, pending, completed,
    loading, error,
    create, accept, decline, complete,
    refresh: load,
  };
}
