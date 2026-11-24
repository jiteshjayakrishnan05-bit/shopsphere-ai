/**
 * Pure catalogue logic: filter, sort, paginate and facet products.
 * The AI assistant (Phase 8) reuses these functions instead of duplicating filtering.
 */

/** @param {import("@/services/api/normalize-product").Product[]} products */
export function filterProducts(products, f) {
  return products.filter((p) => {
    if (f.categories?.length && !f.categories.includes(p.category)) return false;
    if (f.brands?.length && !f.brands.includes(p.brand)) return false;
    if (f.minPrice != null && p.price < f.minPrice) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.minRating != null && p.rating < f.minRating) return false;
    if (f.stock === "in" && !p.inStock) return false;
    if (f.stock === "out" && p.inStock) return false;
    if (f.onSale && !(p.discountPercentage > 0)) return false;
    return true;
  });
}

export function sortProducts(products, sort) {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price || a.id - b.id);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price || a.id - b.id);
    case "rating":
      return list.sort((a, b) => b.rating - a.rating || a.id - b.id);
    case "newest":
      return list.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || b.id - a.id);
    default:
      return list; // relevance: keep API order
  }
}

export function paginate(items, page, pageSize) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageCount,
    total: items.length,
  };
}

/** Filter options (with counts) and price bounds derived from a product set. */
export function getFacets(products) {
  const count = (key) => {
    const map = new Map();
    products.forEach((p) => p[key] && map.set(p[key], (map.get(p[key]) ?? 0) + 1));
    return [...map].map(([value, n]) => ({ value, count: n })).sort((a, b) => a.value.localeCompare(b.value));
  };
  const prices = products.map((p) => p.price);
  return {
    categories: count("category"),
    brands: count("brand"),
    priceBounds: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 },
  };
}

/** Filter, sort and paginate in one call. */
export function applyCatalogue(products, params, pageSize) {
  const filtered = sortProducts(filterProducts(products, params), params.sort);
  return { ...paginate(filtered, params.page, pageSize), all: filtered };
}
