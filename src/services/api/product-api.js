import { apiGet } from "./api-client";
import { normalizeProduct, normalizeProductList } from "./normalize-product";
import { PAGE_SIZE } from "@/lib/constants";

export async function fetchProducts({ limit = PAGE_SIZE, skip = 0, sortBy, order, signal } = {}) {
  return normalizeProductList(await apiGet("/products", { params: { limit, skip, sortBy, order }, signal }));
}

export async function fetchProduct(id, { signal } = {}) {
  return normalizeProduct(await apiGet(`/products/${encodeURIComponent(id)}`, { signal }));
}

export async function searchProducts(query, { limit = PAGE_SIZE, skip = 0, signal } = {}) {
  return normalizeProductList(await apiGet("/products/search", { params: { q: query, limit, skip }, signal }));
}

export async function fetchProductsByCategory(category, { limit = PAGE_SIZE, skip = 0, signal } = {}) {
  return normalizeProductList(
    await apiGet(`/products/category/${encodeURIComponent(category)}`, { params: { limit, skip }, signal }),
  );
}

/** DummyJSON returns everything when limit=0. The catalogue filters client-side because the API cannot filter by price, rating or brand. */
export const fetchAllProducts = ({ signal } = {}) => fetchProducts({ limit: 0, signal });
export const searchAllProducts = (query, { signal } = {}) => searchProducts(query, { limit: 0, signal });
export const fetchAllProductsByCategory = (category, { signal } = {}) =>
  fetchProductsByCategory(category, { limit: 0, signal });
