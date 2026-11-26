import { describe, it, expect } from "vitest";
import {
  MIN_PERSONALIZATION_SIGNALS, byScore, mockSignals, priceSimilarity, productSimilarity, recommendationWeights,
  relationScore, scoreProduct, scoringModifiers, similarScore, similarWeights, tagOverlapWith, trendingScore, trendingWeights,
} from "@/services/recommendation/recommendation-scoring";
import { buildProfile, deriveTypicalRange, weightedQuantile } from "@/services/recommendation/recommendation-signals";

import { mk } from "../fixtures.js";
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

describe("scoring weights (centralised and documented)", () => {
  it("uses the PRD weights, which total 1", () => {
    expect(recommendationWeights).toEqual({
      categoryMatch: 0.22, priceSimilarity: 0.16, tagOverlap: 0.16, normalizedRating: 0.1,
      recentlyViewedRelation: 0.12, wishlistRelation: 0.12, cartRelation: 0.12,
    });
    expect(sum(recommendationWeights)).toBeCloseTo(1, 10);
  });
  it("keeps the other weight sets normalised", () => {
    expect(sum(similarWeights)).toBeCloseTo(1, 10);
    expect(sum(trendingWeights)).toBeCloseTo(1, 10);
    expect(scoringModifiers.brandAffinity + scoringModifiers.searchMatch).toBeCloseTo(1, 10);
    expect(scoringModifiers.blend).toBeGreaterThan(0);
    expect(scoringModifiers.blend).toBeLessThan(1);
    expect(MIN_PERSONALIZATION_SIGNALS).toBeGreaterThanOrEqual(2);
  });
});

describe("score components", () => {
  it("prices: 1 inside the range, decaying outside, neutral without a range", () => {
    const range = { low: 1000, high: 2000 };
    expect(priceSimilarity(1500, range)).toBe(1);
    expect(priceSimilarity(1000, range)).toBe(1);
    expect(priceSimilarity(500, range)).toBeGreaterThan(0);
    expect(priceSimilarity(500, range)).toBeLessThan(1);
    expect(priceSimilarity(50000, range)).toBe(0);
    expect(priceSimilarity(500, null)).toBe(0.5);
  });
  it("tag overlap is the share of the product's tags that match", () => {
    expect(tagOverlapWith(["a", "b"], new Set(["a"]))).toBe(0.5);
    expect(tagOverlapWith([], new Set(["a"]))).toBe(0);
    expect(tagOverlapWith(["a"], new Set())).toBe(0);
  });
  it("product similarity combines category, tags and brand", () => {
    expect(productSimilarity(mk(1), mk(1))).toBe(1);
    expect(productSimilarity(mk(1), mk(2))).toBe(0.5); // same category only
    expect(productSimilarity(mk(1, { category: "a" }), mk(2, { category: "b" }))).toBe(0);
    expect(productSimilarity(mk(1, { tags: ["x"], brand: "B" }), mk(2, { tags: ["x"], brand: "B" }))).toBe(1);
  });
  it("relation ignores the product itself and picks the strongest anchor", () => {
    const anchors = [{ product: mk(1, { category: "z" }), weight: 1 }, { product: mk(2), weight: 0.5 }];
    const r = relationScore(mk(3), anchors);
    expect(r.anchor.id).toBe(2);
    expect(r.value).toBe(0.25);
    expect(relationScore(mk(2), [{ product: mk(2), weight: 1 }]).value).toBe(0);
  });
  it("mock trending signals are deterministic and within 0-1", () => {
    for (let id = 1; id <= 200; id++) {
      const a = mockSignals(mk(id));
      expect(a).toEqual(mockSignals(mk(id)));
      for (const v of Object.values(a)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      const t = trendingScore(mk(id));
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });
});

describe("weighted formula", () => {
  const profile = (over = {}) => ({
    anchors: { viewed: [], wishlist: [], cart: [] }, categoryAffinity: { laptops: 1 }, priceRange: { low: 0, high: 1000 },
    topTagSet: new Set(["x"]), brandAffinity: {}, searchTerms: [], ...over,
  });
  it("matches a hand-calculated example", () => {
    // category 1, price 1, tags 1, rating 5/5 = 1  ->  0.22 + 0.16 + 0.16 + 0.10 = 0.64 (relations 0)
    const p = mk(1, { price: 500, tags: ["x"], rating: 5 });
    const s = scoreProduct(p, profile());
    expect(s.base).toBeCloseTo(0.64, 10);
    expect(s.score).toBeCloseTo(0.9 * 0.64, 10); // 10% blended with brand/search modifiers, both 0 here
  });
  it("adds the brand and search modifiers inside the 0-1 bound", () => {
    const p = mk(1, { price: 500, tags: ["x"], rating: 5, brand: "Acme", title: "shiny laptop" });
    const s = scoreProduct(p, profile({ brandAffinity: { Acme: 1 }, searchTerms: ["laptop"] }));
    expect(s.score).toBeCloseTo(0.9 * 0.64 + 0.1 * (0.6 * 1 + 0.4 * 1), 10);
    expect(s.score).toBeLessThanOrEqual(1);
  });
  it("counts relation components with their weights", () => {
    const viewed = mk(2); // same category as the product: similarity 0.5
    const p = mk(1, { price: 500, tags: [], rating: 0 });
    const s = scoreProduct(p, profile({ categoryAffinity: {}, topTagSet: new Set(), anchors: { viewed: [{ product: viewed, weight: 1 }], wishlist: [], cart: [] } }));
    // price 1 * 0.16 + recentlyViewed 0.5 * 0.12 = 0.22
    expect(s.base).toBeCloseTo(0.22, 10);
  });
  it("keeps every component and the final score between 0 and 1 for many products", () => {
    const catalogue = Array.from({ length: 60 }, (_, i) =>
      mk(i + 1, { category: ["laptops", "beauty", "sunglasses"][i % 3], price: 100 + i * 997, rating: (i % 6) * 1, tags: [["a", "b"], ["b"], ["c", "d"]][i % 3], brand: i % 4 ? "B" + (i % 4) : null }),
    );
    const prof = buildProfile({ catalogue, viewedIds: [1, 2, 3], wishlistIds: [4, 5], cartProductIds: [6], purchasedProductIds: [7, 8], searchTerms: ["a", "laptop"] });
    for (const p of catalogue) {
      const s = scoreProduct(p, prof);
      for (const v of Object.values(s.components)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
    }
  });
  it("similar score favours same category, shared tags and close prices", () => {
    const seed = mk(1, { price: 1000, tags: ["a", "b"] });
    const close = similarScore(mk(2, { price: 1100, tags: ["a"], rating: 4 }), seed).score;
    const far = similarScore(mk(3, { category: "beauty", price: 90000, tags: ["z"], rating: 4 }), seed).score;
    expect(close).toBeGreaterThan(far);
  });
  it("orders by score with a stable tie-break on id", () => {
    const items = [{ product: { id: 3 }, score: 0.5 }, { product: { id: 1 }, score: 0.5 }, { product: { id: 2 }, score: 0.9 }];
    expect(items.sort(byScore).map((i) => i.product.id)).toEqual([2, 1, 3]);
  });
});

describe("profile builder", () => {
  const catalogue = [
    mk(1, { category: "laptops", price: 50000, brand: "Acme", tags: ["laptop"] }),
    mk(2, { category: "beauty", price: 800, brand: "Glow", tags: ["beauty"] }),
    mk(3, { category: "beauty", price: 1200, brand: "Glow", tags: ["beauty", "skin"] }),
    mk(4, { category: "laptops", price: 60000, tags: ["laptop"] }),
  ];
  it("ignores deleted or unknown products", () => {
    const p = buildProfile({ catalogue, viewedIds: [999, 1], wishlistIds: [888] });
    expect(p.signalCount).toBe(1);
    expect(p.anchors.viewed).toHaveLength(1);
    expect(p.anchors.wishlist).toHaveLength(0);
  });
  it("counts distinct products across all signal types", () => {
    expect(buildProfile({ catalogue, viewedIds: [1], wishlistIds: [1], cartProductIds: [2], purchasedProductIds: [3] }).signalCount).toBe(3);
    expect(buildProfile({ catalogue }).signalCount).toBe(0);
  });
  it("weights purchases above browsing when building category affinity", () => {
    const p = buildProfile({ catalogue, viewedIds: [1], purchasedProductIds: [2] });
    expect(p.categoryAffinity.beauty).toBe(1);
    expect(p.categoryAffinity.laptops).toBeLessThan(1);
    expect(p.dominantCategory).toBe("beauty");
    expect(p.categoryShare.beauty + p.categoryShare.laptops).toBeCloseTo(1, 10);
  });
  it("decays older recently-viewed items", () => {
    const p = buildProfile({ catalogue, viewedIds: [1, 2, 3] });
    expect(p.anchors.viewed.map((a) => a.product.id)).toEqual([1, 2, 3]);
    expect(p.anchors.viewed[0].weight).toBe(1);
    expect(p.anchors.viewed[1].weight).toBeCloseTo(0.85, 10);
    expect(p.anchors.viewed[2].weight).toBeCloseTo(0.7225, 10);
  });
  it("never recommends back what the customer already bought, carted or saved", () => {
    const p = buildProfile({ catalogue, purchasedProductIds: [1], cartProductIds: [2], wishlistIds: [3] });
    expect([...p.excludeIds].sort()).toEqual([1, 2, 3]);
  });
  it("derives a typical price range", () => {
    expect(weightedQuantile([{ v: 1, w: 1 }, { v: 2, w: 1 }, { v: 3, w: 1 }, { v: 4, w: 1 }], 0.5)).toBe(2);
    expect(weightedQuantile([], 0.5)).toBeNull();
    expect(deriveTypicalRange([])).toBeNull();
    expect(deriveTypicalRange([{ v: 1000, w: 1 }])).toEqual({ low: 700, high: 1300 }); // one price widens around it
    expect(deriveTypicalRange([{ v: 800, w: 1 }, { v: 4200, w: 1 }])).toEqual({ low: 800, high: 4200 });
    expect(buildProfile({ catalogue }).priceRange).toBeNull();
  });
  it("cleans, de-duplicates and limits search terms", () => {
    const p = buildProfile({ catalogue, searchTerms: [" Phone ", "phone", "", "a", "b", "c", "d", "e"] });
    expect(p.searchTerms).toEqual(["phone", "a", "b", "c", "d"]);
  });
});
