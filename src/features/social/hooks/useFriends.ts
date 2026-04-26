import { useState, useEffect, useCallback } from 'react';
import {
  fetchFriendships,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  searchUserByEmail,
} from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { Friendship, UserProfile } from '@/types';

interface RawFriendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend: {
    id: string;
    username: string;
    avatar_url: string | null;
    xp: number;
    streak: number;
    is_public: boolean;
  } | null;
}

interface RawProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  streak: number;
  is_public: boolean;
}

function mapFriendship(raw: RawFriendship, myId: string): Friendship {
  const otherProfile = raw.friend
    ? ({
        id: raw.friend.id,
        username: raw.friend.username,
        avatarUrl: raw.friend.avatar_url,
        xp: raw.friend.xp ?? 0,
        streak: raw.friend.streak ?? 0,
        isPublic: raw.friend.is_public ?? false,
      } satisfies UserProfile)
    : undefined;

  return {
    id: raw.id,
    userId: raw.user_id,
    friendId: raw.user_id === myId ? raw.friend_id : raw.user_id,
    status: raw.status as Friendship['status'],
    createdAt: raw.created_at,
    friend: otherProfile,
  };
}

export interface UseFriendsReturn {
  friendships: Friendship[];
  accepted: Friendship[];
  pending: Friendship[];
  loading: boolean;
  error: string | null;
  searchResults: UserProfile[];
  searching: boolean;
  search: (email: string) => Promise<void>;
  sendRequest: (friendId: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  declineRequest: (friendshipId: string) => Promise<void>;
  unfriend: (friendshipId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFriends(): UseFriendsReturn {
  const user = useAppStore((s) => s.authState.user);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setFriendships([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await fetchFriendships(user.id);
      if (err) throw err;
      const mapped = ((data ?? []) as unknown as RawFriendship[]).map((r) =>
        mapFriendship(r, user.id),
      );
      setFriendships(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading friends');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const search = useCallback(async (email: string) => {
    if (!email.trim() || !user) return;
    setSearching(true);
    try {
      const { data } = await searchUserByEmail(email.trim());
      const results: UserProfile[] = ((data ?? []) as RawProfile[])
        .filter((p) => p.id !== user.id)
        .map((p) => ({
          id: p.id,
          username: p.username,
          avatarUrl: p.avatar_url,
          xp: p.xp ?? 0,
          streak: p.streak ?? 0,
          isPublic: p.is_public ?? false,
        }));
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, [user]);

  const sendRequest = useCallback(async (friendId: string) => {
    if (!user) return;
    await sendFriendRequest(user.id, friendId);
    setSearchResults([]);
    await load();
  }, [user, load]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    await respondFriendRequest(friendshipId, 'accepted');
    await load();
  }, [load]);

  const declineRequest = useCallback(async (friendshipId: string) => {
    await respondFriendRequest(friendshipId, 'blocked');
    await load();
  }, [load]);

  const unfriend = useCallback(async (friendshipId: string) => {
    await removeFriend(friendshipId);
    await load();
  }, [load]);

  const accepted = friendships.filter((f) => f.status === 'accepted');
  const pending = friendships.filter(
    (f) => f.status === 'pending' && f.userId !== user?.id,
  );

  return {
    friendships,
    accepted,
    pending,
    loading,
    error,
    searchResults,
    searching,
    search,
    sendRequest,
    acceptRequest,
    declineRequest,
    unfriend,
    refresh: load,
  };
}
