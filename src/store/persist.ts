import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

/** Adapter that lets Zustand's `persist` middleware use idb-keyval as its backing store. */
export function createIdbStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (key): Promise<StorageValue<T> | null> => {
      const raw = (await idbGet(key)) as StorageValue<T> | undefined;
      return raw ?? null;
    },
    setItem: async (key, value): Promise<void> => {
      await idbSet(key, value);
    },
    removeItem: async (key): Promise<void> => {
      await idbSet(key, undefined);
    },
  };
}
