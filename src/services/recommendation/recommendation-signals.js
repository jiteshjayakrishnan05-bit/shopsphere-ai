import { RELATION_DECAY, signalWeights } from "./recommendation-scoring";

const normalise = (map) => {
  const max = Math.max(0, ...Object.values(map));
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, max > 0 ? v / max : 0]));
};
const shares = (map) => {
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, total > 0 ? v / total : 0]));
};

/** Smallest value whose cumulative weight reaches quantile q of the total weight. */
export function weightedQuantile(items, q) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => a.v - b.v);
  const total = sorted.reduce((s, i) => s + i.w, 0);
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.w;
    if (cumulative >= q * total - 1e-9) return item.v;
  }
  return sorted[sorted.length - 1].v;
}

/** Typical price range: the weighted 25th-75th percentile, widened around the median when too narrow. */
export function deriveTypicalRange(prices) {
  if (!prices.length) return null;
  const low = weightedQuantile(prices, 0.25);
  const high = weightedQuantile(prices, 0.75);
  const median = weightedQuantile(prices, 0.5);
  if (high - low < 0.4 * median) return { low: Math.round(median * 0.7), high: Math.round(median * 1.3) };
  return { low: Math.round(low), high: Math.round(high) };
}

export const roundTo = (n, step = 100) => Math.round(n / step) * step;

/**
 * Turn raw activity into a customer profile. Unknown product ids (deleted or never loaded) are ignored,
 * so a removed product can never break or skew recommendations.
 * @param {{catalogue: object[], viewedIds?: number[], wishlistIds?: number[], cartProductIds?: number[],
 *   purchasedProductIds?: number[], searchTerms?: string[]}} input
 */
export function buildProfile({ catalogue, viewedIds = [], wishlistIds = [], cartProductIds = [], purchasedProductIds = [], searchTerms = [] }) {
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  const resolve = (ids) => [...new Set(ids)].map((id) => byId.get(id)).filter(Boolean);
  const viewed = [...new Set(viewedIds)].map((id) => byId.get(id)).filter(Boolean);
  const anchors = {
    viewed: viewed.map((product, i) => ({ product, weight: RELATION_DECAY ** i })), // most recent first, decaying
    wishlist: resolve(wishlistIds).map((product) => ({ product, weight: 1 })),
    cart: resolve(cartProductIds).map((product) => ({ product, weight: 1 })),
    purchased: resolve(purchasedProductIds).map((product) => ({ product, weight: 1 })),
  };

  const category = {};
  const brand = {};
  const tag = {};
  const prices = [];
  for (const [kind, list] of Object.entries(anchors)) {
    for (const { product, weight } of list) {
      const w = signalWeights[kind] * weight;
      category[product.category] = (category[product.category] ?? 0) + w;
      if (product.brand) brand[product.brand] = (brand[product.brand] ?? 0) + w;
      for (const t of product.tags ?? []) tag[t] = (tag[t] ?? 0) + w;
      prices.push({ v: product.price, w });
    }
  }

  const tagAffinity = normalise(tag);
  const topTags = Object.entries(tagAffinity).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([t]) => t);
  const categoryShare = shares(category);
  const dominantCategory = Object.entries(category).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  const signalIds = new Set(Object.values(anchors).flatMap((list) => list.map((a) => a.product.id)));

  return {
    signalCount: signalIds.size,
    anchors,
    categoryAffinity: normalise(category),
    categoryShare,
    brandAffinity: normalise(brand),
    brandShare: shares(brand),
    tagAffinity,
    topTags,
    topTagSet: new Set(topTags),
    priceRange: deriveTypicalRange(prices),
    dominantCategory,
    searchTerms: [...new Set(searchTerms.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 5),
    // Items the customer already owns, carted or saved are never recommended back to them.
    excludeIds: new Set([...purchasedProductIds, ...cartProductIds, ...wishlistIds]),
  };
}

