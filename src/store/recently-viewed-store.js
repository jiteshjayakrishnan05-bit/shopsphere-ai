import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

const MAX_ITEMS = 20;

/** Exact browsing history, most recent first, no duplicates. */
export const useRecentlyViewedStore = createPersistedStore(STORAGE_KEYS.recentlyViewed, (set) => ({
  /** @type {number[]} */
  ids: [],
  record: (id) =>
    set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, MAX_ITEMS) })),
  clear: () => set({ ids: [] }),
}));
