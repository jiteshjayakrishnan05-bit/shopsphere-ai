import { applyEdit, isHidden } from "@/lib/admin-product-model";
import { useAdminProductsStore } from "@/store/admin-products-store";

/** Current local admin changes. Rehydrates first so a query that runs before the app finishes hydrating still sees them. */
export function getOverlayState() {
  const store = useAdminProductsStore;
  if (typeof window !== "undefined" && !store.persist.hasHydrated()) store.persist.rehydrate();
  return store.getState();
}

const matchesQuery = (p, q) => {
  const hay = `${p.title} ${p.description} ${p.category} ${(p.tags ?? []).join(" ")}`.toLowerCase();
  return hay.includes(String(q).toLowerCase());
};

/**
 * What customers see: API products with admin edits applied, minus deleted and archived ones,
 * plus admin-created products when `includeCreated` is set.
 */
export function storefrontList(products, state, { category = null, query = null, includeCreated = false } = {}) {
  const base = products.filter((p) => !isHidden(p.id, state)).map((p) => applyEdit(p, state));
  if (!includeCreated) return base;
  const created = state.created.filter((p) => !isHidden(p.id, state) && (!category || p.category === category) && (!query || matchesQuery(p, query)));
  return [...base, ...created];
}

/** What the administrator sees: everything except deleted products, with an `archived` flag. */
export function adminList(products, state) {
  const withFlag = (p) => ({ ...p, archived: state.archivedIds.includes(p.id) });
  return [
    ...products.filter((p) => !state.deletedIds.includes(p.id)).map((p) => withFlag(applyEdit(p, state))),
    ...state.created.filter((p) => !state.deletedIds.includes(p.id)).map(withFlag),
  ];
}

export const isCustomCategory = (slug, state) => state.customCategories.some((c) => c.slug === slug);
