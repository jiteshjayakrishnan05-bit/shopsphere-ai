import { persistedStores } from "@/store";

/** Mark all persisted stores as hydrated (what <StoreHydrator /> does in the real app). */
export function hydrateStores() {
  persistedStores.forEach((s) => s.persist.rehydrate());
}
