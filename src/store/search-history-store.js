import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";
import { sanitizeSearchQuery } from "@/lib/validators";

const MAX_TERMS = 8;

/** Recent search terms, most recent first, case-insensitive de-duplication. */
export const useSearchHistoryStore = createPersistedStore(STORAGE_KEYS.searchHistory, (set) => ({
  /** @type {string[]} */
  terms: [],
  record: (raw) => {
    const term = sanitizeSearchQuery(raw);
    if (!term) return;
    set((s) => ({
      terms: [term, ...s.terms.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, MAX_TERMS),
    }));
  },
  remove: (term) => set((s) => ({ terms: s.terms.filter((t) => t !== term) })),
  clear: () => set({ terms: [] }),
}));
