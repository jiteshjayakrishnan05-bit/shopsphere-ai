import { getRecommendationProvider } from "./recommendation-provider";

/**
 * Collect the raw activity signals the engine needs from app state.
 * Purchases come only from the signed-in customer's own orders.
 */
export function collectSignals({ viewedIds = [], wishlistIds = [], cartItems = [], orders = [], user = null, searchTerms = [] }) {
  const mine = user ? orders.filter((o) => o.userId === String(user.id)) : [];
  return {
    viewedIds,
    wishlistIds,
    cartProductIds: [...new Set(cartItems.map((i) => i.productId))],
    purchasedProductIds: [...new Set(mine.flatMap((o) => o.items.map((i) => i.productId)))],
    searchTerms,
  };
}

/**
 * Get recommendations from the active provider. Never throws: a provider failure or malformed answer
 * becomes an empty result flagged `error`, so a page is never broken by recommendations.
 * Out-of-stock items and duplicates are removed here so any provider is held to the same rules.
 */
export async function getRecommendations(request) {
  try {
    const raw = await getRecommendationProvider().getRecommendations(request);
    if (!raw || !Array.isArray(raw.items)) throw new Error("Malformed recommendation result");
    const seen = new Set();
    const items = raw.items.filter((i) => {
      if (!i?.product || !i.product.inStock || seen.has(i.product.id)) return false;
      seen.add(i.product.id);
      return true;
    });
    return { ...raw, items: items.slice(0, request.limit ?? 8), error: false };
  } catch {
    return { strategy: request.strategy, title: "", subtitle: "", items: [], isFallback: false, error: true };
  }
}
