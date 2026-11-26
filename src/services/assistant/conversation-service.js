/**
 * Conversation memory and refinement rules. Pure functions.
 *
 * A context remembers the last search so follow-ups can refine it:
 *   { category, maxPrice, minPrice, minRating, colour, resultIds, pending }
 */
export const emptyContext = () => ({ category: null, maxPrice: null, minPrice: null, minRating: null, colour: null, resultIds: [], pending: false });

/** Rating steps used for "better ratings". */
const RATING_STEPS = [4, 4.5, 4.8];
export const nextRatingThreshold = (current) => RATING_STEPS.find((r) => r > (current ?? 0)) ?? RATING_STEPS[RATING_STEPS.length - 1];

export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * New price ceiling for "something cheaper": strictly below the median price of what was just shown.
 * Falls back to 75% of the current ceiling when there is nothing to compare.
 */
export function cheaperCeiling(referencePrices, currentMax) {
  const m = median(referencePrices);
  if (m !== null) return Math.max(1, Math.ceil(m) - 1);
  return currentMax ? Math.max(1, Math.floor(currentMax * 0.75)) : null;
}

/**
 * Combine what the shopper just said with what we remember.
 *  - Naming a category starts a fresh search. Only an explicit switch ("never mind ... instead")
 *    keeps general preferences (price and rating), while category-specific ones (colour) are dropped.
 *  - Without a category, the message refines the previous search.
 *  - Constraints given before any category was known are held (`pending`) and applied to the next category.
 *
 * @param {import("./intent-parser").Intent} intent
 * @param {ReturnType<typeof emptyContext>} context
 * @param {number[]} referencePrices prices of the products shown last (or of the category), for "cheaper"
 */
export function buildQuery(intent, context, referencePrices = []) {
  const general = { minPrice: context.minPrice, maxPrice: context.maxPrice, minRating: context.minRating };
  let base;
  if (intent.category) {
    if (intent.instead || context.pending) base = context.pending ? { ...general, colour: context.colour } : general;
    else base = {};
  } else {
    base = { category: context.category, ...general, colour: context.colour };
  }
  const q = { category: null, maxPrice: null, minPrice: null, minRating: null, colour: null, ...base };
  if (intent.category) q.category = intent.category;

  if (intent.maxPrice !== null) q.maxPrice = intent.maxPrice;
  else if (intent.cheaper) q.maxPrice = cheaperCeiling(referencePrices, q.maxPrice) ?? q.maxPrice;
  if (intent.minPrice !== null) q.minPrice = intent.minPrice;
  if (q.minPrice !== null && q.maxPrice !== null && q.minPrice > q.maxPrice) [q.minPrice, q.maxPrice] = [q.maxPrice, q.minPrice];

  if (intent.minRating !== null) q.minRating = intent.minRating;
  else if (intent.betterRated) q.minRating = nextRatingThreshold(q.minRating);
  if (intent.colour) q.colour = intent.colour;
  return q;
}
