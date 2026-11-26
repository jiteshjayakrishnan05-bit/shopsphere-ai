import { describe, it, expect } from "vitest";
import { mk } from "../fixtures.js";
import { respondToMessage, ASSISTANT_DISCLAIMER, RESULTS_SHOWN } from "@/services/assistant/assistant-service";
import { buildQuery, cheaperCeiling, emptyContext, median, nextRatingThreshold } from "@/services/assistant/conversation-service";
import { parseIntent } from "@/services/assistant/intent-parser";
import { STARTER_PROMPTS } from "@/services/assistant/category-lexicon";
import { filterProducts } from "@/features/products/catalogue-filter";
import { matchesColour } from "@/features/products/variants";

const catalogue = [
  // smartphones
  mk(1, { category: "smartphones", price: 9000, rating: 3.5, title: "Budget Phone" }),
  mk(2, { category: "smartphones", price: 15000, rating: 4.2, title: "Mid Phone" }),
  mk(3, { category: "smartphones", price: 22000, rating: 4.6, title: "Great Phone", tags: ["phone"] }),
  mk(4, { category: "smartphones", price: 28000, rating: 4.0, title: "Solid Phone" }),
  mk(5, { category: "smartphones", price: 45000, rating: 4.9, title: "Flagship Phone" }),
  // headphones live in mobile-accessories (virtual category), next to a charger
  mk(10, { category: "mobile-accessories", price: 2500, rating: 4.5, title: "Wireless Headphones A", tags: ["headphones"] }),
  mk(11, { category: "mobile-accessories", price: 1800, rating: 3.9, title: "Earbuds B", tags: ["earbuds"] }),
  mk(12, { category: "mobile-accessories", price: 6500, rating: 4.7, title: "Studio Headset C", tags: ["headset"] }),
  mk(14, { category: "mobile-accessories", price: 900, rating: 4.8, title: "Fast Charger", tags: ["charger"] }),
  mk(20, { category: "laptops", price: 35000, rating: 4.3, title: "Laptop One" }),
  mk(21, { category: "laptops", price: 60000, rating: 4.4, title: "Laptop Two" }),
  // sunglasses support the colour variants from the demo fixture; blue is unavailable when (id + 2) % 7 === 0
  mk(30, { category: "sunglasses", price: 1500, rating: 4.1, title: "Shades 30" }),
  mk(31, { category: "sunglasses", price: 2500, rating: 4.1, title: "Shades 31" }),
  mk(32, { category: "sunglasses", price: 3500, rating: 4.1, title: "Shades 32" }),
  mk(33, { category: "sunglasses", price: 5000, rating: 4.1, title: "Shades 33" }),
  mk(40, { category: "beauty", price: 800, rating: 4.4, title: "Red Lipstick", description: "A bold red shade" }),
  mk(41, { category: "beauty", price: 700, rating: 5, title: "Out of stock gloss", inStock: false }),
];
const say = (text, context = emptyContext()) => respondToMessage({ text, context, catalogue });
const ids = (r) => r.message.productIds;
const titles = (r) => ids(r).map((id) => catalogue.find((p) => p.id === id).title);

describe("a single request", () => {
  it("finds smartphones under a budget, best rated first, using the shared filter", async () => {
    const r = await say("Show me smartphones under 30000 rupees");
    expect(ids(r)).toEqual([3, 2, 4, 1]); // 4.6, 4.2, 4.0, 3.5
    expect(r.message.chips).toEqual(["smartphones", "under ₹30,000"]);
    expect(r.message.text).toContain("I found 4 smartphones under ₹30,000");
    expect(r.context).toMatchObject({ category: "smartphones", maxPrice: 30000, resultIds: [3, 2, 4, 1] });
  });
  it("understands headphones as a virtual category inside mobile accessories", async () => {
    const r = await say("Show me headphones under 5000 with good ratings");
    expect(titles(r)).toEqual(["Wireless Headphones A"]); // charger excluded, earbuds rated 3.9, headset over budget
    expect(r.message.chips).toContain("4★ & up");
  });
  it("shows only the top results and links to the full list", async () => {
    const r = await say("show me phones");
    expect(ids(r)).toHaveLength(RESULTS_SHOWN);
    expect(r.message.text).toMatch(/I found 5 smartphones\. Here are the top 4/);
    expect(r.message.link).toEqual({ href: "/products?category=smartphones", label: "See all 5 results" });
  });
  it("never shows out-of-stock products", async () => {
    expect(ids(await say("show me beauty products"))).toEqual([40]);
  });
  it("tells the shopper when nothing matches, with the cheapest option as a hint", async () => {
    const r = await say("smartphones under 10");
    expect(ids(r)).toEqual([]);
    expect(r.message.text).toContain("I couldn't find any smartphones under ₹10");
    expect(r.message.text).toContain("₹9,000");
    expect(r.message.suggestions.length).toBeGreaterThanOrEqual(2);
  });
});

describe("conversational refinement (PRD §7.3)", () => {
  it("handles the full follow-up chain with remembered context", async () => {
    let r = await say("Show me smartphones under 30000 rupees");
    expect(ids(r)).toEqual([3, 2, 4, 1]);

    // "Show me something cheaper": ceiling drops below the median of what was shown
    r = await say("Show me something cheaper", r.context);
    expect(median([22000, 15000, 28000, 9000])).toBe(18500);
    expect(r.context.maxPrice).toBe(18499);
    expect(r.context.category).toBe("smartphones");
    expect(ids(r)).toEqual([2, 1]);
    expect(r.message.productIds.every((id) => catalogue.find((p) => p.id === id).price <= 18499)).toBe(true);

    // "Something with better ratings": raises the minimum, keeps category and price
    r = await say("Something with better ratings", r.context);
    expect(r.context).toMatchObject({ category: "smartphones", maxPrice: 18499, minRating: 4 });
    expect(ids(r)).toEqual([2]);

    // "Show me more like the first one": seeds the Similar Products strategy
    r = await say("Show me more like the first one", r.context);
    expect(r.message.text).toBe("Here are products similar to Mid Phone.");
    expect(ids(r)).not.toContain(2);
    expect(ids(r).length).toBeGreaterThan(0);

    // "Never mind, show me headphones instead": new category, price and rating kept
    r = await say("Never mind, show me headphones instead", r.context);
    expect(r.context).toMatchObject({ category: "headphones", maxPrice: 18499, minRating: 4, colour: null });
    expect(titles(r)).toEqual(["Studio Headset C", "Wireless Headphones A"]);
  });

  it("'cheaper' reduces the ceiling relative to the previous results, never raising it", async () => {
    let r = await say("laptops under 70000");
    const before = r.context.maxPrice;
    r = await say("something cheaper", r.context);
    expect(r.context.maxPrice).toBeLessThan(before);
    expect(ids(r)).toEqual([20]);
  });

  it("'better ratings' steps the minimum up each time", async () => {
    let r = await say("smartphones");
    r = await say("better ratings", r.context);
    expect(r.context.minRating).toBe(4);
    r = await say("even better ratings", r.context);
    expect(r.context.minRating).toBe(4.5);
    expect(ids(r)).toEqual([5, 3]);
  });

  it("'only in blue' filters by colour where the data supports it, keeping category and price", async () => {
    let r = await say("sunglasses under 4000");
    expect(ids(r)).toEqual([30, 31, 32]);
    r = await say("Only in blue", r.context);
    expect(r.context).toMatchObject({ category: "sunglasses", colour: "blue", maxPrice: 4000 });
    expect(ids(r)).toEqual([30, 31, 32]); // all three list Blue as available
    r = await say("show me sunglasses in blue"); // 33 is the unavailable one
    expect(ids(r)).toEqual([30, 31, 32]);
    expect(ids(r)).not.toContain(33);
  });

  it("explains when a colour cannot be filtered instead of ignoring it silently", async () => {
    let r = await say("smartphones under 30000");
    r = await say("only in blue", r.context);
    expect(ids(r)).toEqual([]);
    expect(r.message.text).toContain("I can only filter by colour where the product data lists colours");
    expect(r.context.colour).toBeNull(); // a dead-end filter is not remembered
    expect(r.context.category).toBe("smartphones");
  });

  it("matches colours named in product text", async () => {
    expect(ids(await say("red lipstick"))).toEqual([40]);
  });

  it("a new category without 'instead' starts a fresh search", async () => {
    let r = await say("smartphones under 10000");
    r = await say("show me laptops", r.context);
    expect(r.context.maxPrice).toBeNull();
    expect(ids(r)).toEqual([21, 20]);
  });

  it("'instead' keeps price and rating but drops category-specific colour", () => {
    const ctx = { ...emptyContext(), category: "sunglasses", maxPrice: 4000, minRating: 4, colour: "blue" };
    const q = buildQuery(parseIntent("actually show me watches instead"), ctx);
    expect(q).toMatchObject({ category: "watches", maxPrice: 4000, minRating: 4, colour: null });
  });

  it("holds a constraint given before any category and applies it to the next one", async () => {
    let r = await say("under 30000");
    expect(r.message.text).toContain("What kind of product");
    expect(ids(r)).toEqual([]);
    expect(r.context.pending).toBe(true);
    r = await say("smartphones", r.context);
    expect(r.context.maxPrice).toBe(30000);
    expect(ids(r)).toEqual([3, 2, 4, 1]);
  });

  it("asks which product when there is nothing to refine", async () => {
    const r = await say("something cheaper");
    expect(ids(r)).toEqual([]);
    expect(r.message.text).toContain("What kind of product");
  });
});

describe("similar-product requests", () => {
  it("needs earlier results", async () => {
    const r = await say("more like the second one");
    expect(ids(r)).toEqual([]);
    expect(r.message.text).toContain("any results to compare yet");
  });
  it("rejects positions that were not shown", async () => {
    const first = await say("laptops");
    const r = await say("more like the 5th one", first.context);
    expect(r.message.text).toContain("I only showed 2 products");
    expect(ids(r)).toEqual([]);
  });
  it("'like the last one' uses the last product shown", async () => {
    const first = await say("smartphones under 30000");
    const r = await say("more like the last one", first.context);
    expect(r.message.text).toBe("Here are products similar to Budget Phone.");
  });
});

describe("unrecognised and small-talk messages (PRD §7.4)", () => {
  it("never returns unrelated products for a message it cannot understand", async () => {
    const r = await say("what is the meaning of life");
    expect(ids(r)).toEqual([]);
    expect(r.message.text).toContain("not sure I understood");
    expect(r.message.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(r.message.suggestions.length).toBeLessThanOrEqual(3);
    for (const s of r.message.suggestions) expect(STARTER_PROMPTS).toContain(s);
  });
  it("keeps the conversation context when it cannot understand a message", async () => {
    const first = await say("smartphones under 30000");
    const r = await say("blah blah", first.context);
    expect(r.context).toEqual(first.context);
  });
  it("answers greetings, thanks and help without products", async () => {
    for (const text of ["hello", "thanks!", "what can you do?"]) {
      const r = await say(text);
      expect(ids(r)).toEqual([]);
      expect(r.message.text.length).toBeGreaterThan(10);
    }
  });
  it("resets the conversation", async () => {
    const first = await say("smartphones under 30000");
    const r = await say("start over", first.context);
    expect(r.context).toEqual(emptyContext());
  });
  it("starter prompts all produce results", async () => {
    for (const prompt of STARTER_PROMPTS.slice(0, 3)) expect((await say(prompt)).message.productIds.length).toBeGreaterThan(0);
  });
  it("states honestly that it is rule-based", () => {
    expect(ASSISTANT_DISCLAIMER).toBe("This shopping assistant uses rule-based intent recognition and product filtering. It does not currently use a live large language model.");
  });
});

describe("conversation helpers", () => {
  it("computes medians and the cheaper ceiling", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(cheaperCeiling([1000], null)).toBe(999);
    expect(cheaperCeiling([], 1000)).toBe(750);
    expect(cheaperCeiling([], null)).toBeNull();
  });
  it("steps ratings 4, 4.5, 4.8 and stays at the top", () => {
    expect([null, 4, 4.5, 4.8, 5].map(nextRatingThreshold)).toEqual([4, 4.5, 4.8, 4.8, 4.8]);
  });
  it("fixes an inverted price range", () => {
    const q = buildQuery({ ...parseIntent("phones"), minPrice: 9000, maxPrice: 3000 }, emptyContext());
    expect([q.minPrice, q.maxPrice]).toEqual([3000, 9000]);
  });
});

describe("shared product filter keeps working for the catalogue (reused, not duplicated)", () => {
  it("supports keywords and colour in addition to the existing filters", () => {
    const f = { categories: [], brands: [], minPrice: null, maxPrice: null, minRating: null, stock: "all", onSale: false };
    expect(filterProducts(catalogue, { ...f, keywords: ["headset"] }).map((p) => p.id)).toEqual([12]);
    expect(filterProducts(catalogue, { ...f, colour: "blue", categories: ["sunglasses"] }).map((p) => p.id)).toEqual([30, 31, 32]);
    expect(filterProducts(catalogue, f)).toHaveLength(catalogue.length); // unchanged without the new fields
  });
  it("only claims colours the data supports", () => {
    expect(matchesColour(mk(30, { category: "sunglasses" }), "Blue")).toBe(true);
    expect(matchesColour(mk(30, { category: "sunglasses" }), "red")).toBe(false);
    expect(matchesColour(mk(1, { category: "smartphones" }), "blue")).toBe(false);
    expect(matchesColour(mk(1, { title: "Silver Watch" }), "silver")).toBe(true);
  });
});
