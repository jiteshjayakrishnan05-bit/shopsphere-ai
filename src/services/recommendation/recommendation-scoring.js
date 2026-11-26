import data from "@/data/recommendations.json";

/**
 * Weighted scoring model (PRD §6.2).
 *   score = w1*categoryMatch + w2*priceSimilarity + w3*tagOverlap + w4*normalizedRating
 *         + w5*recentlyViewedRelation + w6*wishlistRelation + w7*cartRelation
 * Every component is normalised to 0-1 and the weights sum to 1, so the base score is 0-1.
 * All scoring constants live in this file, never in components.
 */
export const recommendationWeights = Object.freeze({
  categoryMatch: 0.22,
  priceSimilarity: 0.16,
  tagOverlap: 0.16,
  normalizedRating: 0.1,
  recentlyViewedRelation: 0.12,
  wishlistRelation: 0.12,
  cartRelation: 0.12,
});

/**
 * Brand-affinity and search-history modifiers. They are blended in rather than added, so the
 * final score stays within 0-1:
 *   final = (1 - blend) * base + blend * (brandAffinity * brand + searchMatch * search)
 * Previous purchases influence the profile (category, tag, brand and price affinity) with the highest signal weight.
 */
export const scoringModifiers = Object.freeze({ blend: 0.1, brandAffinity: 0.6, searchMatch: 0.4 });

/** Similar Products strategy (strategy 2): relatedness to one product. Weights sum to 1. */
export const similarWeights = Object.freeze({ sameCategory: 0.35, tagOverlap: 0.3, priceSimilarity: 0.2, normalizedRating: 0.15 });

/** Trending strategy (strategy 8): mock popularity and rating-velocity signals. Weights sum to 1. */
export const trendingWeights = Object.freeze({ popularity: 0.5, ratingVelocity: 0.3, normalizedRating: 0.2 });

/** How strongly each kind of activity shapes the profile. */
export const signalWeights = Object.freeze({ purchased: 3, cart: 2.5, wishlist: 2, viewed: 1 });

export const RELATION_DECAY = 0.85; // each older recently-viewed item counts 15% less
export const MIN_PERSONALIZATION_SIGNALS = 2; // distinct products of activity needed before personalising
export const MIN_RELEVANCE = 0.2; // candidates below this relation score are dropped
export const MAX_PER_CATEGORY = 4; // variety cap per rail

export const clamp01 = (n) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
export const ratingScore = (p) => clamp01((p.rating ?? 0) / 5);

/** Mock "frequently bought together" strength between two categories (0 when unrelated). */
export const associationStrength = (from, to) => data.associations[from]?.[to] ?? 0;

/**
 * Deterministic mock popularity and rating velocity, derived from the product id (not random per load).
 * @returns {{popularity: number, ratingVelocity: number}} both 0-1
 */
export function mockSignals(product) {
  const h = Math.imul(product.id | 0, 2654435761) >>> 0;
  const momentum = data.categoryMomentum[product.category] ?? 1;
  return { popularity: clamp01(((h % 1000) / 1000) * momentum), ratingVelocity: clamp01(((h >>> 10) % 1000) / 1000) };
}

export function trendingScore(product) {
  const { popularity, ratingVelocity } = mockSignals(product);
  return clamp01(trendingWeights.popularity * popularity + trendingWeights.ratingVelocity * ratingVelocity + trendingWeights.normalizedRating * ratingScore(product));
}

/** Share of `tags` that appear in `reference` (a Set), 0-1. */
export function tagOverlapWith(tags, reference) {
  if (!tags?.length || !reference || reference.size === 0) return 0;
  let hits = 0;
  for (const t of tags) if (reference.has(t)) hits++;
  return hits / tags.length;
}

/** How alike two products are: category 50%, tags 30%, brand 20%. 0-1. */
export function productSimilarity(a, b) {
  if (a.id === b.id) return 1;
  const category = a.category === b.category ? 1 : 0;
  const ta = a.tags ?? [];
  const tb = new Set(b.tags ?? []);
  const tag = ta.length && tb.size ? ta.filter((t) => tb.has(t)).length / Math.min(ta.length, tb.size) : 0;
  const brand = a.brand && b.brand && a.brand === b.brand ? 1 : 0;
  return clamp01(0.5 * category + 0.3 * tag + 0.2 * brand);
}

/** 1 inside the customer's typical range, decaying to 0 as the price moves away from it. Neutral 0.5 with no range. */
export function priceSimilarity(price, range) {
  if (!range) return 0.5;
  const { low, high } = range;
  if (price >= low && price <= high) return 1;
  const distance = price < low ? low - price : price - high;
  const tolerance = Math.max(high - low, (low + high) / 4, 1);
  return clamp01(1 - distance / tolerance);
}

/**
 * Strongest relation between a product and a set of anchors (e.g. recently viewed items).
 * @param {{product: object, weight: number}[]} anchors
 * @returns {{value: number, anchor: object|null}}
 */
export function relationScore(product, anchors) {
  let best = { value: 0, anchor: null };
  for (const { product: a, weight } of anchors) {
    if (a.id === product.id) continue;
    const value = weight * productSimilarity(product, a);
    if (value > best.value) best = { value, anchor: a };
  }
  return best;
}

export function searchMatchScore(product, terms) {
  if (!terms?.length) return 0;
  const hay = `${product.title} ${product.category} ${(product.tags ?? []).join(" ")} ${product.brand ?? ""}`.toLowerCase();
  const hits = terms.filter((t) => hay.includes(t)).length;
  return clamp01(hits / Math.min(terms.length, 3));
}

/**
 * Personalised score for one product against a customer profile.
 * @returns {{score: number, base: number, components: Record<string, number>, modifiers: {brand: number, search: number},
 *   anchors: {viewed: object|null, wishlist: object|null, cart: object|null}}}
 */
export function scoreProduct(product, profile) {
  const viewed = relationScore(product, profile.anchors.viewed);
  const wishlist = relationScore(product, profile.anchors.wishlist);
  const cart = relationScore(product, profile.anchors.cart);
  const components = {
    categoryMatch: clamp01(profile.categoryAffinity[product.category] ?? 0),
    priceSimilarity: priceSimilarity(product.price, profile.priceRange),
    tagOverlap: tagOverlapWith(product.tags ?? [], profile.topTagSet),
    normalizedRating: ratingScore(product),
    recentlyViewedRelation: clamp01(viewed.value),
    wishlistRelation: clamp01(wishlist.value),
    cartRelation: clamp01(cart.value),
  };
  const base = Object.entries(recommendationWeights).reduce((sum, [k, w]) => sum + w * components[k], 0);
  const brand = clamp01(profile.brandAffinity[product.brand] ?? 0);
  const search = searchMatchScore(product, profile.searchTerms);
  const modifier = scoringModifiers.brandAffinity * brand + scoringModifiers.searchMatch * search;
  const score = clamp01((1 - scoringModifiers.blend) * base + scoringModifiers.blend * modifier);
  return { score, base, components, modifiers: { brand, search }, anchors: { viewed: viewed.anchor, wishlist: wishlist.anchor, cart: cart.anchor } };
}

/** Similar Products score between a product and the product being viewed. */
export function similarScore(product, seed) {
  const components = {
    sameCategory: product.category === seed.category ? 1 : 0,
    tagOverlap: tagOverlapWith(product.tags ?? [], new Set(seed.tags ?? [])),
    priceSimilarity: priceSimilarity(product.price, { low: seed.price * 0.7, high: seed.price * 1.3 }),
    normalizedRating: ratingScore(product),
  };
  const score = Object.entries(similarWeights).reduce((sum, [k, w]) => sum + w * components[k], 0);
  return { score: clamp01(score), components };
}

/** Stable ordering: highest score first, ties broken by product id so results never shuffle. */
export const byScore = (a, b) => b.score - a.score || a.product.id - b.product.id;
