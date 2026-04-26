import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, fetchFeed } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { ActivityEvent, ActivityEventType } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RawEvent {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    xp: number;
    streak: number;
    is_public: boolean;
  } | null;
}

function mapEvent(raw: RawEvent): ActivityEvent {
  return {
    id: raw.id,
    userId: raw.user_id,
    type: raw.type as ActivityEventType,
    payload: raw.payload ?? {},
    createdAt: raw.created_at,
    user: raw.user
      ? {
          id: raw.user.id,
          username: raw.user.username,
          avatarUrl: raw.user.avatar_url,
          xp: raw.user.xp ?? 0,
          streak: raw.user.streak ?? 0,
          isPublic: raw.user.is_public ?? false,
        }
      : undefined,
  };
}

export interface UseFeedReturn {
  events: ActivityEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFeed(friendIds: string[]): UseFeedReturn {
  const user = useAppStore((s) => s.authState.user);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const idsKey = friendIds.join(',');

  const load = useCallback(async () => {
    if (!user || friendIds.length === 0) { setEvents([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await fetchFeed(friendIds);
      if (err) throw err;
      setEvents(((data ?? []) as RawEvent[]).map(mapEvent));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading feed');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, idsKey]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: subscribe to new activity events from friends
  useEffect(() => {
    if (!user || friendIds.length === 0) return;

    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel(`feed-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_events',
          filter: `user_id=in.(${friendIds.join(',')})`,
        },
        (payload) => {
          const raw = payload.new as RawEvent;
          setEvents((prev) => [mapEvent(raw), ...prev].slice(0, 50));
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => { void channel.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, idsKey]);

  return { events, loading, error, refresh: load };
}
