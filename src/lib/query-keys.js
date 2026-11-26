/**
 * Central TanStack Query key factory. Every query key in the app comes from here
 * so invalidation and cache sharing stay predictable.
 */
export const queryKeys = {
  products: {
    all: ["products"],
    list: (params = {}) => ["products", "list", params],
    detail: (id) => ["products", "detail", String(id)],
    search: (query, params = {}) => ["products", "search", query, params],
    catalogue: (source) => ["products", "catalogue", source],
    byCategory: (category, params = {}) => ["products", "category", category, params],
  },
  categories: { all: ["categories"] },
  recommendations: (strategy, seedId, category, limit, fingerprint, size) => ["recommendations", strategy, seedId, category, limit, fingerprint, size],
};
