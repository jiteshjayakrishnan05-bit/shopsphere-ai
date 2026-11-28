import { describe, it, expect, beforeEach } from "vitest";
import seed from "@/data/reviews.json";
import orders from "@/data/orders.json";
import { REVIEW_SORTS, apiReviewsFor, isVerifiedPurchase, ratingDistribution, sortReviews, voteCounts } from "@/features/reviews/review-logic";
import { initialReviewsState, useReviewsStore } from "@/store/reviews-store";
import { validateReview } from "@/lib/validators";

const r = (id, over = {}) => ({ id, productId: 1, userId: "u", authorName: "A", rating: 3, text: "text text text", createdAt: "2026-11-01T00:00:00.000Z", helpful: 0, notHelpful: 0, ...over });
const s = () => useReviewsStore.getState();

describe("review sorting", () => {
  const list = [
    r("a", { rating: 5, createdAt: "2026-11-01T00:00:00Z", helpful: 1 }),
    r("b", { rating: 1, createdAt: "2026-11-03T00:00:00Z", helpful: 9 }),
    r("c", { rating: 5, createdAt: "2026-11-02T00:00:00Z", helpful: 4 }),
    r("d", { rating: 3, createdAt: null, helpful: 4 }),
  ];
  const ids = (x) => x.map((i) => i.id);
  it("lists the four required sort options", () => {
    expect(REVIEW_SORTS.map((o) => o.label)).toEqual(["Most recent", "Highest rated", "Lowest rated", "Most helpful"]);
  });
  it("sorts by recency, highest, lowest and helpfulness with stable tie-breaks", () => {
    expect(ids(sortReviews(list, "recent"))).toEqual(["b", "c", "a", "d"]); // undated last
    expect(ids(sortReviews(list, "highest"))).toEqual(["c", "a", "d", "b"]); // 5,5 (newer first),3,1
    expect(ids(sortReviews(list, "lowest"))).toEqual(["b", "d", "c", "a"]);
    expect(ids(sortReviews(list, "helpful"))).toEqual(["b", "c", "d", "a"]); // 9, then 4 (newer first), 4, 1
  });
  it("includes locally cast votes when ranking helpfulness and does not mutate the input", () => {
    const copy = [...list];
    const votes = { a: { x: "up", y: "up", z: "up", w: "up", v: "up", q: "up", p: "up", o: "up", n: "up", m: "up" } };
    expect(ids(sortReviews(list, "helpful", votes))[0]).toBe("a");
    expect(list).toEqual(copy);
    expect(ids(sortReviews(list, "unknown"))).toEqual(["b", "c", "a", "d"]); // falls back to most recent
  });
});

describe("rating statistics", () => {
  it("counts stars and averages", () => {
    const d = ratingDistribution([r("1", { rating: 5 }), r("2", { rating: 5 }), r("3", { rating: 2 }), r("4", { rating: 4 })]);
    expect(d.counts).toEqual({ 5: 2, 4: 1, 3: 0, 2: 1, 1: 0 });
    expect(d.total).toBe(4);
    expect(d.average).toBe(4);
  });
  it("handles no reviews", () => {
    expect(ratingDistribution([])).toEqual({ counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, total: 0, average: 0 });
  });
});

describe("verified purchase is derived, never stored", () => {
  it("is true only when the reviewer ordered the product (local orders)", () => {
    const review = r("x", { userId: "demo-customer", productId: 1 });
    expect(isVerifiedPurchase(review, orders)).toBe(true);
    expect(isVerifiedPurchase({ ...review, productId: 99 }, orders)).toBe(false);
    expect(isVerifiedPurchase({ ...review, userId: "stranger" }, orders)).toBe(false);
    expect(isVerifiedPurchase({ ...review, userId: null }, orders)).toBe(false);
  });
  it("also accepts the mock purchase records for seed reviewers", () => {
    expect(isVerifiedPurchase(r("y", { userId: "seed-u1", productId: 2 }), [], seed.purchaseRecords)).toBe(true);
    expect(isVerifiedPurchase(r("y", { userId: "seed-u1", productId: 3 }), [], seed.purchaseRecords)).toBe(false);
  });
  it("does not mark every seed review as verified", () => {
    const flags = seed.reviews.map((x) => isVerifiedPurchase(x, orders, seed.purchaseRecords));
    expect(flags.some(Boolean)).toBe(true);
    expect(flags.some((f) => !f)).toBe(true);
    expect(seed.reviews.every((x) => !("verified" in x) && !("verifiedPurchase" in x))).toBe(true);
  });
});

describe("seed data and catalogue reviews", () => {
  it("has valid seed reviews that pass the submission rules", () => {
    expect(seed.reviews.length).toBeGreaterThanOrEqual(10);
    for (const x of seed.reviews) expect(validateReview({ rating: x.rating, text: x.text })).toEqual({});
    expect(new Set(seed.reviews.map((x) => x.id)).size).toBe(seed.reviews.length);
  });
  it("converts DummyJSON reviews to read-only review objects", () => {
    const out = apiReviewsFor({ id: 4, raw: { reviews: [{ rating: 5, comment: "Fine", reviewerName: "Sam", reviewerEmail: "s@x.com", date: "2026-01-01T00:00:00Z" }, { rating: 9, comment: null }] } });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: "api-4-0", rating: 5, authorName: "Sam", text: "Fine", userId: null, source: "catalogue" });
    expect(out[0]).not.toHaveProperty("reviewerEmail");
    expect(out[1]).toMatchObject({ rating: 5, text: "", authorName: "Customer" }); // clamped, safe defaults
    expect(apiReviewsFor({ id: 1, raw: {} })).toEqual([]);
  });
  it("adds votes to the seed counts", () => {
    expect(voteCounts(r("a", { helpful: 2, notHelpful: 1 }), { a: { u1: "up", u2: "down", u3: "up" } })).toEqual({ helpful: 4, notHelpful: 2 });
    expect(voteCounts(r("a"), {})).toEqual({ helpful: 0, notHelpful: 0 });
  });
});

describe("reviews store", () => {
  beforeEach(() => {
    localStorage.clear();
    useReviewsStore.setState(initialReviewsState());
  });
  const input = (over = {}) => ({ productId: 50, userId: "u1", authorName: "Asha", rating: 4, text: "  Works really well.  ", ...over });
  it("starts with the seed reviews", () => {
    expect(s().reviews).toHaveLength(seed.reviews.length);
  });
  it("adds a trimmed review at the top and allows only one per customer per product", () => {
    const id = s().addReview(input());
    expect(s().reviews[0]).toMatchObject({ id, text: "Works really well.", rating: 4, userId: "u1", helpful: 0 });
    expect(s().addReview(input({ rating: 1 }))).toBeNull();
    expect(s().addReview(input({ productId: 51 }))).not.toBeNull();
    expect(s().addReview(input({ userId: "u2" }))).not.toBeNull();
  });
  it("edits and removes a review (removing also drops its votes)", () => {
    const id = s().addReview(input());
    s().vote(id, "u9", "up");
    s().updateReview(id, { rating: 2, text: " Changed my mind. " });
    expect(s().reviews.find((x) => x.id === id)).toMatchObject({ rating: 2, text: "Changed my mind." });
    expect(s().reviews.find((x) => x.id === id).updatedAt).toBeTruthy();
    s().removeReview(id);
    expect(s().reviews.find((x) => x.id === id)).toBeUndefined();
    expect(s().votes[id]).toBeUndefined();
  });
  it("lets each voter vote once, switch sides, or take a vote back", () => {
    s().vote("rev", "u1", "up");
    s().vote("rev", "u2", "up");
    expect(s().votes.rev).toEqual({ u1: "up", u2: "up" });
    s().vote("rev", "u1", "down");
    expect(s().votes.rev.u1).toBe("down");
    s().vote("rev", "u1", "down");
    expect(s().votes.rev).toEqual({ u2: "up" });
  });
});
