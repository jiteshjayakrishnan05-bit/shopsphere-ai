import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

/** Wishlist stores product IDs only; product data comes from TanStack Query. */
export const useWishlistStore = createPersistedStore(STORAGE_KEYS.wishlist, (set) => ({
  /** @type {number[]} */
  ids: [],
  toggle: (id) =>
    set((s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id] })),
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
  clear: () => set({ ids: [] }),
}));
