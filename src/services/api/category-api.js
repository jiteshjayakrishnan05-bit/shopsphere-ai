import { apiGet, ApiError } from "./api-client";
import { getOverlayState } from "./admin-overlay";

/** @returns {Promise<{slug: string, name: string}[]>} */
export async function fetchCategories({ signal } = {}) {
  const data = await apiGet("/products/categories", { signal });
  if (!Array.isArray(data)) {
    throw new ApiError("We received an unexpected response from the store.", { kind: "parse" });
  }
  const custom = getOverlayState().customCategories.map((c) => ({ slug: c.slug, name: c.name }));
  return [...data.map((c) => ({ slug: c.slug, name: c.name })), ...custom];
}
