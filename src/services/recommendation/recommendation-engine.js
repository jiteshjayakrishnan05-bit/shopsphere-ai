import { formatCategory, formatPrice } from "@/lib/formatters";
import {
  MAX_PER_CATEGORY, MIN_PERSONALIZATION_SIGNALS, MIN_RELEVANCE, associationStrength, byScore, clamp01, mockSignals,
  priceSimilarity, ratingScore, recommendationWeights, relationScore, scoreProduct, similarScore, trendingScore,
} from "./recommendation-scoring";
import { roundTo } from "./recommendation-signals";
import { STRATEGY } from "./recommendation-strategies";

/**
 * Rule-based recommendation strategies. Pure functions: catalogue + profile in, ranked explainable items out.
 * @typedef {{product: object, score: number, reason: string}} RecommendationItem
 * @typedef {{strategy: string, title: string, subtitle: string, items: RecommendationItem[], isFallback: boolean}} RecommendationResult
 */

const available = (catalogue, exclude = new Set()) => catalogue.filter((p) => p.inStock && !exclude.has(p.id));
const result = (strategy, title, subtitle, items, isFallback = false) => ({ strategy, title, subtitle, items, isFallback });
const empty = (strategy) => result(strategy, "", "", []);

/** Keep variety: at most `perCategory` per category first, then fill any remaining slots. */
export function diversify(sorted, limit, perCategory = MAX_PER_CATEGORY) {
  const counts = {};
  const picked = [];
  const rest = [];
  for (const item of sorted) {
    const c = item.product.category;
    if ((counts[c] ?? 0) < perCategory) {
      counts[c] = (counts[c] ?? 0) + 1;
      picked.push(item);
    } else rest.push(item);
  }
  return [...picked, ...rest].slice(0, limit).sort(byScore);
}

function bestAssociation(product, anchors) {
  let best = { value: 0, anchor: null };
  for (const { product: a } of anchors) {
    if (a.id === product.id) continue;
    const value = associationStrength(a.category, product.category);
    if (value > best.value) best = { value, anchor: a };
  }
  return best;
}

/** Strategy 1: related to what the customer looked at recently. */
function becauseViewed({ catalogue, profile, limit }) {
  const anchors = profile.anchors.viewed;
  if (!anchors.length) return empty(STRATEGY.becauseViewed);
  const exclude = new Set([...profile.excludeIds, ...anchors.map((a) => a.product.id)]);
  const items = [];
  for (const p of available(catalogue, exclude)) {
    const rel = relationScore(p, anchors);
    if (rel.value < MIN_RELEVANCE) continue;
    items.push({ product: p, score: clamp01(0.8 * rel.value + 0.2 * ratingScore(p)), reason: `Similar to ${rel.anchor.title}` });
  }
  return result(STRATEGY.becauseViewed, `Because you viewed ${anchors[0].product.title}`, "Picked from products you looked at recently.", diversify(items.sort(byScore), limit));
}

/** Strategy 2: category, tags, price similarity and rating relative to one product. */
function similar({ catalogue, seed, limit }) {
  if (!seed) return empty(STRATEGY.similar);
  const items = available(catalogue, new Set([seed.id]))
    .map((p) => {
      const { score, components: c } = similarScore(p, seed);
      const reason = c.sameCategory ? (c.tagOverlap > 0 ? "Same category with shared tags" : "Same category") : c.tagOverlap > 0 ? "Shares tags with this product" : "Similar price and rating";
      return { product: p, score, reason };
    })
    .filter((i) => i.score >= MIN_RELEVANCE)
    .sort(byScore)
    .slice(0, limit);
  return result(STRATEGY.similar, "Similar products", "Matched on category, tags, price and rating.", items);
}

/** Strategy 3: the category being browsed, or the customer's dominant category. */
function categoryPicks({ catalogue, profile, category, limit }) {
  const cat = category ?? profile.dominantCategory;
  if (!cat) return empty(STRATEGY.category);
  const items = available(catalogue, profile.excludeIds)
    .filter((p) => p.category === cat)
    .map((p) => ({
      product: p,
      score: clamp01(0.6 * ratingScore(p) + 0.25 * priceSimilarity(p.price, profile.priceRange) + 0.15 * mockSignals(p).popularity),
      reason: `Popular in ${formatCategory(cat)}`,
    }))
    .sort(byScore)
    .slice(0, limit);
  return result(STRATEGY.category, category ? `Popular in ${formatCategory(cat)}` : `Popular in ${formatCategory(cat)}, a category you like`, "Top-rated picks from this category.", items);
}

/** Strategy 4: inside the customer's typical shopping range. */
function priceBased({ catalogue, profile, limit }) {
  const r = profile.priceRange;
  if (!r) return empty(STRATEGY.price);
  const label = `${formatPrice(roundTo(r.low))}–${formatPrice(roundTo(r.high))}`;
  const items = available(catalogue, profile.excludeIds)
    .filter((p) => p.price >= r.low && p.price <= r.high)
    .map((p) => ({ product: p, score: clamp01(0.5 * ratingScore(p) + 0.3 + 0.2 * mockSignals(p).popularity), reason: `Fits your usual range of ${label}` }))
    .sort(byScore);
  return result(STRATEGY.price, "Within your usual price range", `Products between ${label}, your typical shopping range.`, diversify(items, limit));
}

/** Strategy 5: alternatives (same kind) and complements (mock associations) to wishlist items. */
function wishlistBased({ catalogue, profile, limit }) {
  const anchors = profile.anchors.wishlist;
  if (!anchors.length) return empty(STRATEGY.wishlist);
  const items = [];
  for (const p of available(catalogue, profile.excludeIds)) {
    const alt = relationScore(p, anchors);
    const comp = bestAssociation(p, anchors);
    const relevance = Math.max(alt.value, comp.value * 0.8);
    if (relevance < MIN_RELEVANCE) continue;
    const reason = comp.value * 0.8 > alt.value ? `Pairs well with ${comp.anchor.title}` : `Similar to ${alt.anchor.title} on your wishlist`;
    items.push({ product: p, score: clamp01(0.7 * relevance + 0.2 * ratingScore(p) + 0.1 * priceSimilarity(p.price, profile.priceRange)), reason });
  }
  return result(STRATEGY.wishlist, "Based on your wishlist", "Alternatives and complements to items you saved.", diversify(items.sort(byScore), limit));
}

/** Strategy 6: complements to what is in the cart. */
function cartBased({ catalogue, profile, limit }) {
  const anchors = profile.anchors.cart;
  if (!anchors.length) return empty(STRATEGY.cart);
  const items = [];
  for (const p of available(catalogue, profile.excludeIds)) {
    const comp = bestAssociation(p, anchors);
    const rel = relationScore(p, anchors);
    if (comp.value <= 0 && rel.value < MIN_RELEVANCE) continue;
    const reason = comp.value > 0 ? `Goes well with ${comp.anchor.title}` : `Similar to ${rel.anchor.title} in your cart`;
    items.push({ product: p, score: clamp01(0.5 * comp.value + 0.3 * rel.value + 0.2 * ratingScore(p)), reason });
  }
  return result(STRATEGY.cart, "Complete your order", "Items that go with what is in your cart.", diversify(items.sort(byScore), limit, 2));
}

/** Strategy 7: mock association data (not random): categories commonly bought with the product's category. */
function frequentlyBoughtTogether({ catalogue, seed, limit }) {
  if (!seed) return empty(STRATEGY.frequentlyBoughtTogether);
  const items = [];
  for (const p of available(catalogue, new Set([seed.id]))) {
    const assoc = associationStrength(seed.category, p.category);
    if (assoc <= 0) continue;
    const priceCompat = p.price <= seed.price ? 1 : clamp01(seed.price / p.price);
    items.push({
      product: p,
      score: clamp01(0.55 * assoc + 0.2 * ratingScore(p) + 0.15 * priceCompat + 0.1 * mockSignals(p).popularity),
      reason: `Often bought with ${seed.title}`,
    });
  }
  return result(STRATEGY.frequentlyBoughtTogether, "Frequently bought together", "Based on demo purchase-association data.", diversify(items.sort(byScore), limit, 2));
}

/** Strategy 8: ranked by mock popularity and rating velocity. */
function trending({ catalogue, category, limit }) {
  const pool = available(catalogue).filter((p) => !category || p.category === category);
  const items = pool.map((p) => ({ product: p, score: trendingScore(p), reason: "Trending right now" })).sort(byScore);
  return result(STRATEGY.trending, "Trending right now", "Ranked by demo popularity and rating momentum.", diversify(items, limit, 3));
}

const REASON_PRIORITY = ["recentlyViewedRelation", "wishlistRelation", "cartRelation", "categoryMatch", "tagOverlap"];

/** Explain a personalised pick using the strongest personal signal behind it. */
function explain(product, scored) {
  const { components: c, anchors } = scored;
  let best = null;
  for (const key of REASON_PRIORITY) {
    const contribution = recommendationWeights[key] * c[key];
    if (contribution >= 0.04 && (!best || contribution > best.contribution)) best = { key, contribution };
  }
  switch (best?.key) {
    case "recentlyViewedRelation": return `Because you viewed ${anchors.viewed.title}`;
    case "wishlistRelation": return `Related to ${anchors.wishlist.title} on your wishlist`;
    case "cartRelation": return `Goes with ${anchors.cart.title} in your cart`;
    case "categoryMatch": return `Matches your interest in ${formatCategory(product.category)}`;
    case "tagOverlap": return "Shares tags with items you like";
    default: return c.priceSimilarity >= 1 ? "Within your usual price range" : "Highly rated";
  }
}

/** Strategy 9: weighted combination of every available signal; popularity fallback when signals are insufficient. */
function personalized({ catalogue, profile, limit }) {
  if (profile.signalCount < MIN_PERSONALIZATION_SIGNALS) {
    const t = trending({ catalogue, limit });
    return result(
      STRATEGY.personalized,
      "Popular right now",
      "We need a little more activity to personalise this. Browse, save or add items and it will adapt.",
      t.items.map((i) => ({ ...i, reason: "Popular with shoppers" })),
      true,
    );
  }
  const items = available(catalogue, profile.excludeIds)
    .map((p) => {
      const scored = scoreProduct(p, profile);
      return { product: p, score: scored.score, reason: explain(p, scored) };
    })
    .filter((i) => i.score > 0)
    .sort(byScore);
  return result(STRATEGY.personalized, "Recommended for you", "Matched to your categories, price range and recent activity.", diversify(items, limit));
}

const handlers = {
  [STRATEGY.becauseViewed]: becauseViewed,
  [STRATEGY.similar]: similar,
  [STRATEGY.category]: categoryPicks,
  [STRATEGY.price]: priceBased,
  [STRATEGY.wishlist]: wishlistBased,
  [STRATEGY.cart]: cartBased,
  [STRATEGY.frequentlyBoughtTogether]: frequentlyBoughtTogether,
  [STRATEGY.trending]: trending,
  [STRATEGY.personalized]: personalized,
};

/** @returns {RecommendationResult} */
export function runStrategy(strategy, { catalogue, profile, seed = null, category = null, limit = 8 }) {
  const handler = handlers[strategy];
  if (!handler) throw new Error(`Unknown recommendation strategy: ${strategy}`);
  return handler({ catalogue, profile, seed, category, limit });
}
