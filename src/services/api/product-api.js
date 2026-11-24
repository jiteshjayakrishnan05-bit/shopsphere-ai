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
