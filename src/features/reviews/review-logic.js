/** Pure review logic: merging, verification, sorting and rating statistics. */

export const REVIEW_SORTS = Object.freeze([
  { value: "recent", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
  { value: "helpful", label: "Most helpful" },
]);

const clampRating = (n) => Math.min(5, Math.max(1, Math.round(Number(n) || 1)));

/** DummyJSON ships a few reviews per product. They are shown read-only, next to customer reviews. */
export function apiReviewsFor(product) {
  const list = Array.isArray(product.raw?.reviews) ? product.raw.reviews : [];
  return list.map((r, i) => ({
    id: `api-${product.id}-${i}`,
    productId: product.id,
    userId: null,
    authorName: String(r.reviewerName ?? "Customer"),
    rating: clampRating(r.rating),
    text: String(r.comment ?? ""),
    createdAt: r.date ?? null,
    helpful: 0,
    notHelpful: 0,
    source: "catalogue",
  }));
}

/** Seed counts plus the votes cast in this browser. */
export function voteCounts(review, votes) {
  let up = 0;
  let down = 0;
  for (const v of Object.values(votes[review.id] ?? {})) {
    if (v === "up") up++;
    else if (v === "down") down++;
  }
  return { helpful: review.helpful + up, notHelpful: review.notHelpful + down };
}

/**
 * "Verified purchase" is derived, never stored: the reviewer must have an order containing the product
 * in the local order history (or a mock purchase record for seed reviewers).
 */
export function isVerifiedPurchase(review, orders, purchaseRecords = []) {
  if (!review.userId) return false;
  const uid = String(review.userId);
  return (
    orders.some((o) => String(o.userId) === uid && o.items.some((i) => i.productId === review.productId)) ||
    purchaseRecords.some((r) => String(r.userId) === uid && r.productId === review.productId)
  );
}

const time = (r) => (r.createdAt ? Date.parse(r.createdAt) || 0 : 0);

/** Sort without mutating. Ties fall back to most recent, then id, so the order never shuffles. */
export function sortReviews(reviews, sort, votes = {}) {
  const helpful = (r) => voteCounts(r, votes).helpful;
  const byRecent = (a, b) => time(b) - time(a) || String(a.id).localeCompare(String(b.id));
  const compare = {
    recent: byRecent,
    highest: (a, b) => b.rating - a.rating || byRecent(a, b),
    lowest: (a, b) => a.rating - b.rating || byRecent(a, b),
    helpful: (a, b) => helpful(b) - helpful(a) || byRecent(a, b),
  }[sort] ?? byRecent;
  return [...reviews].sort(compare);
}

/** Star counts (5 down to 1), total and average. */
export function ratingDistribution(reviews) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of reviews) {
    const star = clampRating(r.rating);
    counts[star]++;
    sum += star;
  }
  const total = reviews.length;
  return { counts, total, average: total ? sum / total : 0 };
}
