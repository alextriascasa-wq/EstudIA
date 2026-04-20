import type { AppState } from '@/types';
import { DEFAULT_STATE, LEGACY_LOCALSTORAGE_KEY } from './defaults';

/**
 * Read the legacy `sfpro` localStorage blob (if present) and merge it onto defaults.
 *
 * Called at cold boot before Zustand hydrates. After a successful read we DO NOT
 * delete the legacy key yet — that way the user can revert to the Pro HTML and
 * keep working if Phase 1 has any regressions. We'll clean it up in a later phase
 * once the user confirms parity.
 */
export function readLegacyLocalStorage(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return parsed;
  } catch {
    return null;
  }
}

/** Merge legacy blob with defaults, filling any missing keys. */
export function mergeLegacy(legacy: Partial<AppState> | null): AppState {
  if (!legacy) return { ...DEFAULT_STATE };
  const merged: AppState = { ...DEFAULT_STATE, ...legacy };
  // Ensure every default key is present (guard against shape drift).
  (Object.keys(DEFAULT_STATE) as (keyof AppState)[]).forEach((k) => {
    if (merged[k] === undefined) {
      // Assigning through a narrow index keeps TS happy without `any`.
      (merged as unknown as Record<string, unknown>)[k] = DEFAULT_STATE[k];
    }
  });
  return merged;
}
