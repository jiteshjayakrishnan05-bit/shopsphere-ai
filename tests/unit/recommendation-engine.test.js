import { describe, it, expect, afterEach } from "vitest";
import { mk } from "../fixtures.js";
import { buildProfile } from "@/services/recommendation/recommendation-signals";
import { diversify, runStrategy } from "@/services/recommendation/recommendation-engine";
import { STRATEGY, STRATEGY_IDS } from "@/services/recommendation/recommendation-strategies";
import { getRecommendations, collectSignals } from "@/services/recommendation/recommendation-service";
import { mockRecommendationProvider, resetRecommendationProvider, setRecommendationProvider } from "@/services/recommendation/recommendation-provider";

const catalogue = [
  mk(1, { category: "laptops", price: 50000, rating: 4.5, tags: ["laptop", "work"], brand: "Acme" }),
  mk(2, { category: "laptops", price: 45000, rating: 4.0, tags: ["laptop"], brand: "Acme" }),
  mk(3, { category: "laptops", price: 90000, rating: 3.0, tags: ["laptop", "gaming"], brand: "Zed" }),
  mk(4, { category: "mobile-accessories", price: 1500, rating: 4.2, tags: ["charger"] }),
  mk(5, { category: "mobile-accessories", price: 2500, rating: 4.8, tags: ["case"] }),
  mk(6, { category: "smartphones", price: 30000, rating: 4.4, tags: ["phone"], brand: "Acme" }),
  mk(7, { category: "smartphones", price: 60000, rating: 4.9, tags: ["phone"] }),
  mk(8, { category: "beauty", price: 800, rating: 4.1, tags: ["beauty"], brand: "Glow" }),
  mk(9, { category: "beauty", price: 700, rating: 5, tags: ["beauty"], inStock: false }),
  mk(10, { category: "furniture", price: 20000, rating: 3.8, tags: ["sofa"] }),
  mk(11, { category: "beauty", price: 900, rating: 4.0, tags: ["beauty", "skin"], brand: "Glow" }),
];
const run = (strategy, signals = {}, extra = {}) => runStrategy(strategy, { catalogue, profile: buildProfile({ catalogue, ...signals }), ...extra });
const ids = (r) => r.items.map((i) => i.product.id);
afterEach(() => resetRecommendationProvider());

describe("the nine strategies exist and are distinct", () => {
  it("defines exactly nine strategies", () => {
    expect(STRATEGY_IDS).toHaveLength(9);
  });
  it("produce differently ranked, explained results for the same customer", () => {
    const signals = { viewedIds: [1], wishlistIds: [6], cartProductIds: [4], searchTerms: ["laptop"] };
    const seed = catalogue[0];
    const results = Object.fromEntries(STRATEGY_IDS.map((s) => [s, run(s, signals, { seed })]));
    const titles = Object.values(results).map((r) => r.title);
    expect(new Set(titles).size).toBe(9);
    for (const r of Object.values(results)) for (const item of r.items) expect(item.reason.length).toBeGreaterThan(3);
    expect(ids(results.similar)).not.toEqual(ids(results.frequentlyBoughtTogether));
  });
  it("never recommends out-of-stock products from any strategy", () => {
    const signals = { viewedIds: [8], wishlistIds: [11], cartProductIds: [1], purchasedProductIds: [3] };
    for (const s of STRATEGY_IDS) for (const item of run(s, signals, { seed: catalogue[7], category: "beauty" }).items) expect(item.product.inStock).toBe(true);
  });
});

describe("1. Because you viewed", () => {
  it("surfaces related products and excludes the viewed ones", () => {
    const r = run(STRATEGY.becauseViewed, { viewedIds: [1] });
    expect(r.title).toBe("Because you viewed P1");
    expect(ids(r)).not.toContain(1);
    expect(ids(r).slice(0, 2).sort()).toEqual([2, 3]);
    expect(r.items[0].reason).toBe("Similar to P1");
  });
  it("is empty with no history", () => {
    expect(run(STRATEGY.becauseViewed).items).toEqual([]);
  });
  it("works with only one viewed product", () => {
    expect(run(STRATEGY.becauseViewed, { viewedIds: [8] }).items.length).toBeGreaterThan(0);
  });
});

describe("2. Similar products", () => {
  it("ranks the closest product first, excludes the seed and out-of-stock items", () => {
    const r = run(STRATEGY.similar, {}, { seed: catalogue[0] });
    expect(ids(r)[0]).toBe(2); // same category, shared tag and brand, close price
    expect(ids(r)).not.toContain(1);
    expect(ids(r)).not.toContain(9);
  });
  it("is empty with no seed, and with no similar items", () => {
    expect(run(STRATEGY.similar).items).toEqual([]);
    const solo = [mk(1), mk(2, { category: "beauty", price: 99999, rating: 0, tags: ["q"] })];
    expect(runStrategy(STRATEGY.similar, { catalogue: solo, profile: buildProfile({ catalogue: solo }), seed: solo[0] }).items).toHaveLength(0);
  });
});

describe("3. Category", () => {
  it("uses the browsed category, best rated first", () => {
    const r = run(STRATEGY.category, {}, { category: "mobile-accessories" });
    expect(ids(r)).toEqual([5, 4]);
    expect(r.title).toBe("Popular in Mobile Accessories");
  });
  it("falls back to the customer's dominant category", () => {
    const r = run(STRATEGY.category, { viewedIds: [8] });
    expect(r.items.every((i) => i.product.category === "beauty")).toBe(true);
    expect(r.title).toContain("a category you like");
  });
  it("is empty with no category and no history", () => {
    expect(run(STRATEGY.category).items).toEqual([]);
  });
});

describe("4. Price", () => {
  it("recommends products inside the typical range", () => {
    const profile = buildProfile({ catalogue, viewedIds: [4, 5] }); // 1500 and 2500
    const r = runStrategy(STRATEGY.price, { catalogue, profile });
    expect(r.title).toBe("Within your usual price range");
    for (const i of r.items) {
      expect(i.product.price).toBeGreaterThanOrEqual(profile.priceRange.low);
      expect(i.product.price).toBeLessThanOrEqual(profile.priceRange.high);
    }
    expect(r.items.length).toBeGreaterThan(0);
  });
  it("is empty without price signals", () => {
    expect(run(STRATEGY.price).items).toEqual([]);
  });
});

describe("5. Wishlist", () => {
  it("offers alternatives and complements, never the saved items", () => {
    const r = run(STRATEGY.wishlist, { wishlistIds: [1] });
    expect(ids(r)).not.toContain(1);
    expect(ids(r)).toContain(2); // alternative
    expect(ids(r)).toContain(5); // complement
    expect(r.items.find((i) => i.product.id === 5).reason).toBe("Pairs well with P1");
    expect(r.items.find((i) => i.product.id === 2).reason).toBe("Similar to P1 on your wishlist");
  });
  it("is empty for an empty wishlist", () => {
    expect(run(STRATEGY.wishlist).items).toEqual([]);
  });
});

describe("6. Cart", () => {
  it("recommends complements to cart contents and excludes cart items", () => {
    const r = run(STRATEGY.cart, { cartProductIds: [1] });
    expect(ids(r)).not.toContain(1);
    expect(new Set(ids(r).slice(0, 2))).toEqual(new Set([4, 5]));
    expect(r.items[0].reason).toBe("Goes well with P1");
  });
  it("is empty for an empty cart", () => {
    expect(run(STRATEGY.cart).items).toEqual([]);
  });
});

describe("7. Frequently bought together (mock association data)", () => {
  it("only returns products from associated categories", () => {
    const r = run(STRATEGY.frequentlyBoughtTogether, {}, { seed: catalogue[0] });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((i) => i.product.category === "mobile-accessories")).toBe(true);
    expect(r.items[0].reason).toBe("Often bought with P1");
  });
  it("is deterministic, not random", () => {
    const a = ids(run(STRATEGY.frequentlyBoughtTogether, {}, { seed: catalogue[0] }));
    for (let i = 0; i < 5; i++) expect(ids(run(STRATEGY.frequentlyBoughtTogether, {}, { seed: catalogue[0] }))).toEqual(a);
  });
  it("is empty for a category with no associations or no seed", () => {
    expect(run(STRATEGY.frequentlyBoughtTogether, {}, { seed: mk(99, { category: "unknown-category" }) }).items).toEqual([]);
    expect(run(STRATEGY.frequentlyBoughtTogether).items).toEqual([]);
  });
});

describe("8. Trending", () => {
  it("is deterministic, in stock, and scored 0-1", () => {
    const a = run(STRATEGY.trending);
    expect(ids(a)).toEqual(ids(run(STRATEGY.trending)));
    for (const i of a.items) {
      expect(i.product.inStock).toBe(true);
      expect(i.score).toBeGreaterThanOrEqual(0);
      expect(i.score).toBeLessThanOrEqual(1);
    }
  });
  it("can be limited to a category", () => {
    expect(run(STRATEGY.trending, {}, { category: "beauty" }).items.every((i) => i.product.category === "beauty")).toBe(true);
  });
});

describe("9. Personalized for you", () => {
  it("falls back to popular products when there are too few signals", () => {
    for (const signals of [{}, { viewedIds: [1] }, { viewedIds: [999, 998] }]) {
      const r = run(STRATEGY.personalized, signals);
      expect(r.isFallback).toBe(true);
      expect(r.title).toBe("Popular right now");
      expect(r.items.length).toBeGreaterThan(0);
      expect(r.items[0].reason).toBe("Popular with shoppers");
    }
  });
  it("personalises with enough activity and explains each pick", () => {
    const r = run(STRATEGY.personalized, { viewedIds: [1], wishlistIds: [6] });
    expect(r.isFallback).toBe(false);
    expect(r.title).toBe("Recommended for you");
    expect(ids(r)).not.toContain(6); // saved item
    for (const i of r.items) expect(i.reason).toBeTruthy();
  });
  it("changes when browsing changes", () => {
    const laptops = run(STRATEGY.personalized, { viewedIds: [1, 2] });
    const beauty = run(STRATEGY.personalized, { viewedIds: [8, 11] });
    expect(laptops.items[0].product.category).toBe("laptops");
    expect(beauty.items[0].product.category).toBe("beauty");
    expect(ids(laptops)).not.toEqual(ids(beauty));
  });
  it("responds to wishlist activity", () => {
    const rank = (r, id) => ids(r).indexOf(id);
    const before = run(STRATEGY.personalized, { viewedIds: [1, 2] }, { limit: 50 });
    const after = run(STRATEGY.personalized, { viewedIds: [1, 2], wishlistIds: [8] }, { limit: 50 });
    expect(rank(after, 11)).toBeGreaterThanOrEqual(0);
    expect(rank(before, 11) === -1 || rank(after, 11) < rank(before, 11)).toBe(true);
  });
  it("responds to cart activity and excludes purchased items", () => {
    const r = run(STRATEGY.personalized, { cartProductIds: [1], purchasedProductIds: [8] });
    expect(ids(r)).not.toContain(1);
    expect(ids(r)).not.toContain(8);
    expect(ids(r).some((id) => [4, 5].includes(id))).toBe(true);
  });
});

describe("diversify and errors", () => {
  it("caps items per category but still fills the rail", () => {
    const items = [1, 2, 3, 4, 5].map((id, i) => ({ product: mk(id), score: 1 - i * 0.1 }));
    expect(diversify(items, 3, 2)).toHaveLength(3);
    expect(diversify(items, 10, 2)).toHaveLength(5);
  });
  it("rejects unknown strategies", () => {
    expect(() => run("nope")).toThrow(/Unknown recommendation strategy/);
  });
});

describe("recommendation service and provider contract", () => {
  const request = (over = {}) => ({ strategy: STRATEGY.trending, catalogue, signals: {}, limit: 5, ...over });
  it("returns results from the default mock provider", async () => {
    const r = await getRecommendations(request());
    expect(r.error).toBe(false);
    expect(r.items.length).toBeLessThanOrEqual(5);
  });
  it("never throws: a failing provider yields an empty flagged result", async () => {
    setRecommendationProvider({ name: "broken", getRecommendations: async () => { throw new Error("boom"); } });
    expect(await getRecommendations(request())).toMatchObject({ error: true, items: [] });
    setRecommendationProvider({ name: "malformed", getRecommendations: async () => ({ nope: 1 }) });
    expect(await getRecommendations(request())).toMatchObject({ error: true, items: [] });
  });
  it("lets another provider replace the mock one without UI changes", async () => {
    const custom = { name: "ml", getRecommendations: async () => ({ strategy: "trending", title: "From ML", subtitle: "", isFallback: false, items: [{ product: catalogue[0], score: 0.9, reason: "model" }] }) };
    setRecommendationProvider(custom);
    expect((await getRecommendations(request())).title).toBe("From ML");
    resetRecommendationProvider();
    expect((await getRecommendations(request())).title).not.toBe("From ML");
    expect(() => setRecommendationProvider({})).toThrow();
  });
  it("removes out-of-stock and duplicate items returned by any provider", async () => {
    setRecommendationProvider({ name: "sloppy", getRecommendations: async () => ({ strategy: "x", title: "t", subtitle: "", isFallback: false, items: [{ product: catalogue[8], score: 1, reason: "r" }, { product: catalogue[0], score: 1, reason: "r" }, { product: catalogue[0], score: 1, reason: "r" }] }) });
    expect((await getRecommendations(request())).items.map((i) => i.product.id)).toEqual([1]);
  });
  it("collects signals, using only the signed-in customer's orders", () => {
    const orders = [{ userId: "u1", items: [{ productId: 1 }, { productId: 2 }] }, { userId: "u2", items: [{ productId: 3 }] }];
    const s = collectSignals({ viewedIds: [5], wishlistIds: [6], cartItems: [{ productId: 7 }, { productId: 7 }], orders, user: { id: "u1" }, searchTerms: ["x"] });
    expect(s).toEqual({ viewedIds: [5], wishlistIds: [6], cartProductIds: [7], purchasedProductIds: [1, 2], searchTerms: ["x"] });
    expect(collectSignals({ orders, user: null }).purchasedProductIds).toEqual([]);
  });
  it("the mock provider is named and rule-based", () => {
    expect(mockRecommendationProvider.name).toBe("mock-rule-based");
  });
});
