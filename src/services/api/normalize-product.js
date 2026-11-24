import { toInr, originalPriceFrom } from "@/lib/formatters";
import { ApiError } from "./api-client";

/**
 * @typedef {Object} Product
 * @property {number} id
 * @property {string} title
 * @property {string} description
 * @property {string} category        DummyJSON category slug
 * @property {string|null} brand
 * @property {number} price           current price, demo INR
 * @property {number} originalPrice   price before discount, demo INR
 * @property {number} discountPercentage
 * @property {number} rating          0-5
 * @property {number} stock
 * @property {boolean} inStock
 * @property {string[]} tags
 * @property {string} thumbnail
 * @property {string[]} images
 * @property {string|null} sku
 * @property {string|null} createdAt  ISO date when available
 * @property {Object} raw             original API fields kept for specifications
 */

/**
 * Convert a DummyJSON product into the application's Product model.
 * Throws ApiError(kind: "parse") for malformed payloads so the UI shows an error state.
 * @returns {Product}
 */
export function normalizeProduct(raw) {
  if (!raw || typeof raw !== "object" || raw.id == null || typeof raw.title !== "string") {
    throw new ApiError("We received an unexpected response from the store.", { kind: "parse" });
  }
  const discountPercentage = Math.max(0, Math.min(99, Number(raw.discountPercentage) || 0));
  const price = toInr(raw.price);
  const stock = Math.max(0, Number(raw.stock) || 0);
  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
  return {
    id: Number(raw.id),
    title: raw.title,
    description: String(raw.description ?? ""),
    category: String(raw.category ?? "uncategorized"),
    brand: raw.brand ?? null,
    price,
    originalPrice: originalPriceFrom(price, discountPercentage),
    discountPercentage: Math.round(discountPercentage),
    rating: Math.max(0, Math.min(5, Number(raw.rating) || 0)),
    stock,
    inStock: stock > 0,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    thumbnail: raw.thumbnail || images[0] || "",
    images: images.length ? images : raw.thumbnail ? [raw.thumbnail] : [],
    sku: raw.sku ?? null,
    createdAt: raw.meta?.createdAt ?? null,
    raw,
  };
}

/** Normalize a DummyJSON list response: { products, total, skip, limit }. */
export function normalizeProductList(payload) {
  if (!payload || !Array.isArray(payload.products)) {
    throw new ApiError("We received an unexpected response from the store.", { kind: "parse" });
  }
  return {
    products: payload.products.map(normalizeProduct),
    total: Number(payload.total) || 0,
    skip: Number(payload.skip) || 0,
    limit: Number(payload.limit) || payload.products.length,
  };
}
