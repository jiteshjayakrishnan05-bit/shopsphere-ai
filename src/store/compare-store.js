import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

export const MAX_COMPARE = 4;

export const useCompareStore = createPersistedStore(STORAGE_KEYS.compare, (set, get) => ({
  /** @type {number[]} */
  ids: [],
  /** @returns {boolean} false when the list is already full */
  add: (id) => {
    const { ids } = get();
    if (ids.includes(id)) return true;
    if (ids.length >= MAX_COMPARE) return false;
    set({ ids: [...ids, id] });
    return true;
  },
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
  clear: () => set({ ids: [] }),
}));
