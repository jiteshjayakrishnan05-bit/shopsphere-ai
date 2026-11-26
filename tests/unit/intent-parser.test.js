import { describe, it, expect } from "vitest";
import { parseIntent, MAX_INPUT_LENGTH } from "@/services/assistant/intent-parser";

const p = (s) => parseIntent(s);

describe("PRD examples", () => {
  it("smartphones under 30000 rupees", () => {
    expect(p("Show me smartphones under 30000 rupees.")).toMatchObject({ kind: "search", category: "smartphones", maxPrice: 30000, minRating: null });
  });
  it("headphones under 5000 with good ratings", () => {
    expect(p("Show me headphones under 5000 with good ratings.")).toMatchObject({ category: "headphones", maxPrice: 5000, minRating: 4 });
  });
});

describe("price expressions", () => {
  it.each([
    ["phones under ₹5,000", 5000],
    ["phones below 10k", 10000],
    ["phones less than 30000", 30000],
    ["phones up to Rs. 2,500", 2500],
    ["laptops within 1.5 lakh", 150000],
    ["laptops under 45k rupees", 45000],
    ["phones budget of 12000", 12000],
    ["phones ₹8000", 8000],
    ["phones 8000 rupees", 8000],
    ["phones under 30,000", 30000],
  ])("%s -> max %i", (text, max) => {
    expect(p(text).maxPrice).toBe(max);
  });
  it("reads floors and ranges", () => {
    expect(p("laptops above 40000")).toMatchObject({ minPrice: 40000, maxPrice: null });
    expect(p("phones between 10000 and 20000")).toMatchObject({ minPrice: 10000, maxPrice: 20000 });
    expect(p("phones between 20k and 10k")).toMatchObject({ minPrice: 10000, maxPrice: 20000 }); // reversed input is fixed
    expect(p("phones over 5k under 15k")).toMatchObject({ minPrice: 5000, maxPrice: 15000 });
  });
  it("does not treat a rating as a price", () => {
    expect(p("4 star phones under 20000")).toMatchObject({ minRating: 4, maxPrice: 20000, category: "smartphones" });
    expect(p("phones rated 4.5 and above")).toMatchObject({ minRating: 4.5, maxPrice: null, minPrice: null });
  });
  it("ignores absurd or zero amounts", () => {
    expect(p("phones under 0").maxPrice).toBeNull();
    expect(p("phones under 99999999999").maxPrice).toBeNull();
  });
});

describe("ratings", () => {
  it.each(["highly rated phones", "good ratings", "top rated laptops", "well rated phones", "phones with great reviews"])("%s -> 4", (text) => {
    expect(p(text).minRating).toBe(4);
  });
  it("reads explicit values", () => {
    expect(p("rating above 4.5").minRating).toBe(4.5);
    expect(p("4+ stars phones").minRating).toBe(4);
    expect(p("at least 3 stars").minRating).toBe(3);
    expect(p("rating of 9").minRating).toBeNull();
  });
});

describe("categories and synonyms", () => {
  it.each([
    ["mobile phones", "smartphones"], ["a new iphone", "smartphones"], ["notebook", "laptops"], ["earbuds", "headphones"],
    ["sneakers", "shoes"], ["perfume", "fragrances"], ["shades", "sunglasses"], ["handbag", "bags"], ["wristwatch", "watches"],
    ["phone accessories", "mobile-accessories"], ["sofa", "furniture"],
  ])("%s -> %s", (word, category) => {
    expect(p(`show me ${word}`).category).toBe(category);
  });
  it("uses whole words only", () => {
    expect(p("show me microphones").category).toBeNull();
    expect(p("headphones").category).toBe("headphones"); // not 'smartphones' via the substring 'phone'
  });
  it("is case and punctuation tolerant", () => {
    expect(p("SHOW ME LAPTOPS!!!").category).toBe("laptops");
  });
});

describe("colours, refinements and references", () => {
  it("reads colours (grey/gray unified)", () => {
    expect(p("sunglasses in blue")).toMatchObject({ category: "sunglasses", colour: "blue" });
    expect(p("Only in blue.")).toMatchObject({ kind: "search", category: null, colour: "blue" });
    expect(p("something in gray").colour).toBe("grey");
  });
  it("reads relative refinements", () => {
    expect(p("Show me something cheaper.")).toMatchObject({ kind: "search", cheaper: true, category: null, maxPrice: null });
    expect(p("more affordable please").cheaper).toBe(true);
    expect(p("Something with better ratings.")).toMatchObject({ betterRated: true, minRating: null });
  });
  it("lets an explicit ceiling win over 'cheaper'", () => {
    expect(p("something cheaper than 2000")).toMatchObject({ cheaper: false, maxPrice: 2000 });
  });
  it("reads similar-product requests", () => {
    expect(p("Show me more like the second one.")).toMatchObject({ kind: "similar", reference: 2 });
    expect(p("similar to the first")).toMatchObject({ kind: "similar", reference: 1 });
    expect(p("more like 3").reference).toBe(3);
    expect(p("like the last one").reference).toBe(-1);
    expect(p("more like this").reference).toBe(1);
    expect(p("something like 5000")).not.toMatchObject({ kind: "similar" });
  });
  it("detects an explicit category switch", () => {
    expect(p("Never mind, show me headphones instead.")).toMatchObject({ category: "headphones", instead: true });
    expect(p("show me laptops").instead).toBe(false);
  });
});

describe("non-shopping and unknown messages", () => {
  it("recognises greetings, thanks, help and reset", () => {
    expect(p("Hello!").kind).toBe("greeting");
    expect(p("good morning").kind).toBe("greeting");
    expect(p("thanks a lot").kind).toBe("thanks");
    expect(p("what can you do?").kind).toBe("help");
    expect(p("start over").kind).toBe("reset");
    expect(p("clear the filters").kind).toBe("reset");
  });
  it("prefers a search over a greeting or help", () => {
    expect(p("hi, show me phones").kind).toBe("search");
    expect(p("help me find laptops under 50k").kind).toBe("search");
  });
  it("marks nonsense as unknown without inventing a category", () => {
    for (const text of ["asdf qwerty", "what's the weather today", "tell me a joke", "", "   ", "???"]) {
      expect(p(text)).toMatchObject({ kind: "unknown", category: null, maxPrice: null });
    }
  });
  it("copes with null, numbers and extremely long input", () => {
    expect(p(null).kind).toBe("unknown");
    expect(p(12345).kind).toBe("unknown");
    const long = p("phones ".repeat(2000));
    expect(long.raw.length).toBe(MAX_INPUT_LENGTH);
    expect(long.category).toBe("smartphones");
  });
});
