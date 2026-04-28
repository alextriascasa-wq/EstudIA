import { useEffect, useRef } from 'react';
import { supabase, pullState, pushState, buildSyncPayload } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

const DEBOUNCE_MS = 2000;

/**
 * Mounts at App root. Handles:
 * 1. Supabase auth state subscription → keeps store.authState in sync
 * 2. On SIGNED_IN: pull cloud state, merge with local (cloud wins if non-empty)
 * 3. On store mutations: debounce 2s → auto-push to Supabase
 *
 * Loop prevention: store subscription skips push when only authState changed
 * (reference equality check on state.authState vs prevState.authState).
 */
export function useCloudSync(): void {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false); // true after first successful pull post-login

  useEffect(() => {
    const { setAuth, setSyncStatus, patch } = useAppStore.getState();

    // Hydrate session on mount (handles page refresh while already logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session);
      if (session) initializedRef.current = true;
    });

    // Auth state listener
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuth(session?.user ?? null, session);

      if (event === 'SIGNED_IN' && session) {
        setSyncStatus('syncing');
        try {
          const { data, error } = await pullState(session.user.id);
          if (!error && data?.app_state) {
            const remote = data.app_state as Record<string, unknown>;
            if (Object.keys(remote).length > 0) {
              patch(remote as Parameters<typeof patch>[0]);
            }
          }
          setSyncStatus('idle', new Date().toISOString());
        } catch {
          setSyncStatus('error');
        }
        initializedRef.current = true;
      }

      if (event === 'SIGNED_OUT') {
        initializedRef.current = false;
      }
    });

    // Store mutation watcher — debounced auto-push
    const unsubStore = useAppStore.subscribe((state, prevState) => {
      // Guard 1: must be authenticated and past initial pull
      if (!state.authState.user || !initializedRef.current) return;
      // Guard 2: skip when ONLY authState changed — prevents setSyncStatus → push → loop
      if (state.authState !== prevState.authState) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const s = useAppStore.getState();
        if (!s.authState.user) return;
        s.setSyncStatus('syncing');
        const payload = buildSyncPayload(s as unknown as Record<string, unknown>);
        const { error } = await pushState(s.authState.user.id, payload);
        useAppStore
          .getState()
          .setSyncStatus(error ? 'error' : 'idle', error ? undefined : new Date().toISOString());
      }, DEBOUNCE_MS);
    });

    return () => {
      authSub.unsubscribe();
      unsubStore();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []); // intentionally empty — runs once on mount
}
