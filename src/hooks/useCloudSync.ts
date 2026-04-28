import { useEffect, useRef } from 'react';
import { supabase, pullState, pushState, buildSyncPayload } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

const DEBOUNCE_MS = 2000;
const SYNC_TIMEOUT_MS = 15000;

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('sync-timeout')), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

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
          const { data, error } = await withTimeout(pullState(session.user.id), SYNC_TIMEOUT_MS);
          if (error && (error as { code?: string }).code !== 'PGRST116') {
            throw error;
          }
          if (data?.app_state) {
            const remote = data.app_state as Record<string, unknown>;
            if (Object.keys(remote).length > 0) {
              patch(remote as Parameters<typeof patch>[0]);
            }
          }
          setSyncStatus('idle', new Date().toISOString());
        } catch (e) {
          console.error('[cloud-sync] pull failed:', e);
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
        try {
          const { error } = await withTimeout(
            pushState(s.authState.user.id, payload),
            SYNC_TIMEOUT_MS,
          );
          if (error) throw error;
          useAppStore.getState().setSyncStatus('idle', new Date().toISOString());
        } catch (e) {
          console.error('[cloud-sync] push failed:', e);
          useAppStore.getState().setSyncStatus('error');
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      authSub.unsubscribe();
      unsubStore();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []); // intentionally empty — runs once on mount
}
