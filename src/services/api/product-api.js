import { apiGet, ApiError } from "./api-client";
import { applyEdit, isHidden } from "@/lib/admin-product-model";
import { getOverlayState, isCustomCategory, storefrontList } from "./admin-overlay";
import { normalizeProduct, normalizeProductList } from "./normalize-product";
import { PAGE_SIZE } from "@/lib/constants";

const notFound = () => new ApiError("We couldn't find what you were looking for.", { status: 404, kind: "http" });

/**
 * Every function below layers the administrator's LOCAL changes (src/store/admin-products-store.js) over the
 * DummyJSON data: edits are applied, deleted and archived products disappear, and created products appear.
 */
export async function fetchProducts({ limit = PAGE_SIZE, skip = 0, sortBy, order, signal } = {}) {
  const list = normalizeProductList(await apiGet("/products", { params: { limit, skip, sortBy, order }, signal }));
  // Created products belong to the full catalogue (limit 0); a small "top rated" slice never includes them.
  return { ...list, products: storefrontList(list.products, getOverlayState(), { includeCreated: limit === 0 && skip === 0 }) };
}

export async function fetchProduct(id, { signal } = {}) {
  const state = getOverlayState();
  const numeric = Number(id);
  const created = state.created.find((p) => p.id === numeric);
  if (created) {
    if (isHidden(created.id, state)) throw notFound();
    return created;
  }
  if (isHidden(numeric, state)) throw notFound();
  return applyEdit(normalizeProduct(await apiGet(`/products/${encodeURIComponent(id)}`, { signal })), state);
}

export async function searchProducts(query, { limit = PAGE_SIZE, skip = 0, signal } = {}) {
  const list = normalizeProductList(await apiGet("/products/search", { params: { q: query, limit, skip }, signal }));
  return { ...list, products: storefrontList(list.products, getOverlayState(), { query, includeCreated: skip === 0 }) };
}

export async function fetchProductsByCategory(category, { limit = PAGE_SIZE, skip = 0, signal } = {}) {
  const state = getOverlayState();
  // Categories an administrator created do not exist in DummyJSON, so there is nothing to request.
  const list = isCustomCategory(category, state)
    ? { products: [], total: 0, skip: 0, limit: 0 }
    : normalizeProductList(await apiGet(`/products/category/${encodeURIComponent(category)}`, { params: { limit, skip }, signal }));
  return { ...list, products: storefrontList(list.products, state, { category, includeCreated: skip === 0 }) };
}

/**
 * The untouched DummyJSON catalogue (no local changes). The admin screens apply the local changes themselves
 * with adminList(), reactively, so an edit shows instantly without downloading the catalogue again.
 */
export async function fetchAllProductsBase({ signal } = {}) {
  return normalizeProductList(await apiGet("/products", { params: { limit: 0 }, signal }));
}

/** DummyJSON returns everything when limit=0. The catalogue filters client-side because the API cannot filter by price, rating or brand. */
export const fetchAllProducts = ({ signal } = {}) => fetchProducts({ limit: 0, signal });
export const searchAllProducts = (query, { signal } = {}) => searchProducts(query, { limit: 0, signal });
export const fetchAllProductsByCategory = (category, { signal } = {}) =>
  fetchProductsByCategory(category, { limit: 0, signal });
