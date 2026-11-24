import { describe, it, expect } from "vitest";
import { filterProducts, sortProducts, paginate, getFacets, applyCatalogue } from "@/features/products/catalogue-filter";

const mk = (id, over = {}) => ({
  id, title: `P${id}`, category: "a", brand: null, price: 100 * id, rating: 3, inStock: true,
  discountPercentage: 0, createdAt: `2025-0${id}-01T00:00:00Z`, ...over,
});
const products = [
  mk(1, { category: "phones", brand: "Acme", rating: 4.5, discountPercentage: 10 }),
  mk(2, { category: "phones", brand: "Zed", rating: 2.5, inStock: false }),
  mk(3, { category: "laptops", brand: "Acme", rating: 4.9 }),
  mk(4, { category: "laptops", rating: 3.5, discountPercentage: 5 }),
];
const none = { categories: [], brands: [], minPrice: null, maxPrice: null, minRating: null, stock: "all", onSale: false };
const ids = (list) => list.map((p) => p.id);

describe("filterProducts", () => {
  it("returns everything with no filters", () => expect(filterProducts(products, none)).toHaveLength(4));
  it("filters by category and brand", () => {
    expect(ids(filterProducts(products, { ...none, categories: ["phones"] }))).toEqual([1, 2]);
    expect(ids(filterProducts(products, { ...none, brands: ["Acme"] }))).toEqual([1, 3]);
  });
  it("filters by price range inclusively", () => {
    expect(ids(filterProducts(products, { ...none, minPrice: 200, maxPrice: 300 }))).toEqual([2, 3]);
  });
  it("filters by minimum rating", () => expect(ids(filterProducts(products, { ...none, minRating: 4 }))).toEqual([1, 3]));
  it("filters by stock", () => {
    expect(ids(filterProducts(products, { ...none, stock: "in" }))).toEqual([1, 3, 4]);
    expect(ids(filterProducts(products, { ...none, stock: "out" }))).toEqual([2]);
  });
  it("filters on-sale products", () => expect(ids(filterProducts(products, { ...none, onSale: true }))).toEqual([1, 4]));
  it("combines multiple filters", () => {
    expect(ids(filterProducts(products, { ...none, categories: ["laptops"], onSale: true }))).toEqual([4]);
  });
  it("returns an empty list for impossible combinations", () => {
    expect(filterProducts(products, { ...none, minPrice: 9000 })).toEqual([]);
  });
});

describe("sortProducts", () => {
  it("keeps API order for relevance", () => expect(ids(sortProducts(products, "relevance"))).toEqual([1, 2, 3, 4]));
  it("sorts by price", () => {
    expect(ids(sortProducts(products, "price-asc"))).toEqual([1, 2, 3, 4]);
    expect(ids(sortProducts(products, "price-desc"))).toEqual([4, 3, 2, 1]);
  });
  it("sorts by rating and newest", () => {
    expect(ids(sortProducts(products, "rating"))).toEqual([3, 1, 4, 2]);
    expect(ids(sortProducts(products, "newest"))).toEqual([4, 3, 2, 1]);
  });
  it("does not mutate the input", () => {
    const copy = [...products];
    sortProducts(products, "price-desc");
    expect(products).toEqual(copy);
  });
});

describe("paginate / facets / applyCatalogue", () => {
  it("paginates and clamps out-of-range pages", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toMatchObject({ items: [3, 4], page: 2, pageCount: 3, total: 5 });
    expect(paginate([1, 2, 3], 99, 2).page).toBe(2);
    expect(paginate([], 1, 24)).toMatchObject({ items: [], page: 1, pageCount: 1, total: 0 });
  });
  it("builds facets with counts, ignoring missing brands", () => {
    const f = getFacets(products);
    expect(f.categories).toEqual([{ value: "laptops", count: 2 }, { value: "phones", count: 2 }]);
    expect(f.brands).toEqual([{ value: "Acme", count: 2 }, { value: "Zed", count: 1 }]);
    expect(f.priceBounds).toEqual({ min: 100, max: 400 });
  });
  it("applies filter, sort and page together", () => {
    const r = applyCatalogue(products, { ...none, stock: "in", sort: "price-desc", page: 1 }, 2);
    expect(ids(r.items)).toEqual([4, 3]);
    expect(r.total).toBe(3);
    expect(r.pageCount).toBe(2);
  });
});
