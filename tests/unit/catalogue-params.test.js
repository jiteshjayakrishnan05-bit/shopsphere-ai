import { describe, it, expect } from "vitest";
import { parseCatalogueParams, serializeCatalogueParams, countActiveFilters } from "@/features/products/catalogue-params";

const parse = (qs) => parseCatalogueParams(new URLSearchParams(qs));

describe("catalogue params", () => {
  it("returns defaults for an empty query string", () => {
    expect(parse("")).toEqual({
      q: "", categories: [], brands: [], minPrice: null, maxPrice: null, minRating: null,
      stock: "all", onSale: false, sort: "relevance", page: 1,
    });
  });
  it("parses all filters", () => {
    const p = parse("q=phone&category=laptops&category=tablets&brand=Apple&min=100&max=900&rating=4&stock=in&sale=1&sort=price-asc&page=3");
    expect(p).toMatchObject({
      q: "phone", categories: ["laptops", "tablets"], brands: ["Apple"], minPrice: 100, maxPrice: 900,
      minRating: 4, stock: "in", onSale: true, sort: "price-asc", page: 3,
    });
  });
  it("swaps an inverted price range instead of returning no results", () => {
    const p = parse("min=900&max=100");
    expect(p.minPrice).toBe(100);
    expect(p.maxPrice).toBe(900);
  });
  it("ignores invalid values", () => {
    const p = parse("min=abc&max=-5&rating=nope&stock=maybe&sort=chaos&page=-2");
    expect(p).toMatchObject({ minPrice: null, maxPrice: null, minRating: null, stock: "all", sort: "relevance", page: 1 });
  });
  it("caps rating at 5", () => {
    expect(parse("rating=9").minRating).toBe(5);
  });
  it("round-trips through serialize and omits defaults", () => {
    const qs = "?q=phone&category=laptops&brand=Apple&min=100&max=900&rating=4&stock=out&sale=1&sort=rating&page=2";
    expect(parse(qs)).toEqual(parse(serializeCatalogueParams(parse(qs))));
    expect(serializeCatalogueParams(parse(""))).toBe("");
  });
  it("counts active filters but not query, sort or page", () => {
    expect(countActiveFilters(parse("q=a&sort=rating&page=2"))).toBe(0);
    expect(countActiveFilters(parse("category=a&category=b&min=1&rating=3&sale=1&stock=in&brand=x"))).toBe(7);
  });
});
