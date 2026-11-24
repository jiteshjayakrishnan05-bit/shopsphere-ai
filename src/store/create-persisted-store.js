import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Create a localStorage-backed Zustand store that is SAFE for Next.js SSR.
 *
 * - `skipHydration: true` means the store renders its initial state on both server
 *   and first client render (no mismatch). <StoreHydrator /> then rehydrates from
 *   localStorage after mount.
 * - Storage is only touched in the browser.
 *
 * @param {string} name localStorage key
 * @param {(set: Function, get: Function) => object} initializer
 * @param {object} [options] extra persist options (partialize, version, ...)
 */
export function createPersistedStore(name, initializer, options = {}) {
  return create(
    persist(initializer, {
      name,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      ...options,
    }),
  );
}
