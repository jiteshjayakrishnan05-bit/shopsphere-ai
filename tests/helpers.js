import { persistedStores } from "@/store";

/** Mark all persisted stores as hydrated (what <StoreHydrator /> does in the real app). */
export function hydrateStores() {
  persistedStores.forEach((s) => s.persist.rehydrate());
}

import { StrictMode } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Render with a fresh TanStack QueryClient (no retries, so failures surface immediately). */
export function renderWithClient(ui, { strict = false } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const tree = <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

/** A raw DummyJSON-shaped product. price is USD; the app converts at 84 INR per USD. */
export const rawProduct = (id, over = {}) => ({
  id, title: `Product ${id}`, description: "A fine product for testing.", category: "laptops", price: 10,
  discountPercentage: 0, rating: 4.2, stock: 10, brand: "Acme", sku: `SKU${id}`, tags: [], thumbnail: "t.png",
  images: ["a.png", "b.png"], reviews: [{ rating: 5, comment: "Great <b>stuff</b>", reviewerName: "Sam", reviewerEmail: "s@x.com" }],
  ...over,
});

/**
 * Stub fetch for /products/{id}, /products/category/*, /products/categories.
 * `routes[id]` is a raw product, "404", or "network".
 */
export function stubProductApi(routes, categoryProducts = [], catalogue = null) {
  const fn = vi.fn(async (url) => {
    const u = String(url);
    if (u.includes("/products/categories")) return { ok: true, json: async () => [] };
    // Full catalogue request (/products?limit=0): served only when a catalogue is provided.
    if (/\/products\?/.test(u) && !u.includes("/products/")) {
      return catalogue ? { ok: true, json: async () => ({ products: catalogue, total: catalogue.length, skip: 0, limit: 0 }) } : { ok: false, status: 404 };
    }
    if (u.includes("/products/category/")) return { ok: true, json: async () => ({ products: categoryProducts, total: categoryProducts.length, skip: 0, limit: 0 }) };
    const m = u.match(/\/products\/(\d+)/);
    const r = m ? routes[m[1]] : undefined;
    if (r === "network") throw new TypeError("offline");
    if (!r || r === "404") return { ok: false, status: 404 };
    return { ok: true, json: async () => r };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export const cartItem = (productId, quantity, { price = 840, stock = 10, variant = null, title = `Product ${productId}` } = {}) => ({
  lineId: variant ? `${productId}:${variant}` : String(productId), productId, variant, quantity,
  snapshot: { title, price, thumbnail: "t.png", stock, category: "laptops" },
});
