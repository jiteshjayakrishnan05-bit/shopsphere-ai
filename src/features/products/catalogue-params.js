import { SORT_OPTIONS } from "@/lib/constants";

/**
 * @typedef {Object} CatalogueParams
 * @property {string} q
 * @property {string[]} categories
 * @property {string[]} brands
 * @property {number|null} minPrice
 * @property {number|null} maxPrice
 * @property {number|null} minRating
 * @property {"all"|"in"|"out"} stock
 * @property {boolean} onSale
 * @property {string} sort
 * @property {number} page
 */

const SORTS = SORT_OPTIONS.map((o) => o.value);

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Read catalogue state from URL search params. Invalid values fall back to defaults,
 * and an inverted price range is swapped, so a hand-edited URL can never break the page.
 * @param {{get: (k: string) => string|null, getAll: (k: string) => string[]}} sp
 * @returns {CatalogueParams}
 */
export function parseCatalogueParams(sp) {
  let minPrice = toNumber(sp.get("min"));
  let maxPrice = toNumber(sp.get("max"));
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  const rating = toNumber(sp.get("rating"));
  const sort = sp.get("sort");
  const stock = sp.get("stock");
  const page = Math.floor(Number(sp.get("page")));
  return {
    q: sp.get("q") ?? "",
    categories: [...new Set(sp.getAll("category").filter(Boolean))],
    brands: [...new Set(sp.getAll("brand").filter(Boolean))],
    minPrice,
    maxPrice,
    minRating: rating === null ? null : Math.min(5, rating),
    stock: stock === "in" || stock === "out" ? stock : "all",
    onSale: sp.get("sale") === "1",
    sort: SORTS.includes(sort) ? sort : "relevance",
    page: Number.isFinite(page) && page >= 1 ? page : 1,
  };
}

/** Build a query string ("" or "?a=b") from params, omitting defaults. */
export function serializeCatalogueParams(p) {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  p.categories.forEach((c) => sp.append("category", c));
  p.brands.forEach((b) => sp.append("brand", b));
  if (p.minPrice !== null) sp.set("min", String(p.minPrice));
  if (p.maxPrice !== null) sp.set("max", String(p.maxPrice));
  if (p.minRating !== null) sp.set("rating", String(p.minRating));
  if (p.stock !== "all") sp.set("stock", p.stock);
  if (p.onSale) sp.set("sale", "1");
  if (p.sort !== "relevance") sp.set("sort", p.sort);
  if (p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Number of active filters (excludes query, sort and page). */
export function countActiveFilters(p) {
  return (
    p.categories.length +
    p.brands.length +
    (p.minPrice !== null || p.maxPrice !== null ? 1 : 0) +
    (p.minRating !== null ? 1 : 0) +
    (p.stock !== "all" ? 1 : 0) +
    (p.onSale ? 1 : 0)
  );
}
