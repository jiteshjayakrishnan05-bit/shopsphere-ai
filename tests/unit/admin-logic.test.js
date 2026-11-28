import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mk } from "../fixtures.js";
import { FIRST_CREATED_ID, applyEdit, buildCreatedProduct, isHidden, slugify, withDerived } from "@/lib/admin-product-model";
import { initialAdminState, useAdminProductsStore } from "@/store/admin-products-store";
import { adminList, storefrontList } from "@/services/api/admin-overlay";
import { fetchAllProducts, fetchAllProductsBase, fetchProduct, fetchProductsByCategory, searchAllProducts } from "@/services/api/product-api";
import { fetchCategories } from "@/services/api/category-api";
import { computeOverview, customersFrom, filterAdminProducts, filterOrders, lowStock, mergeStats, recentActivity, referencedProductIds, topProducts } from "@/features/admin/admin-metrics";
import { parseProductForm } from "@/features/admin/product-form-validation";
import seedOrders from "@/data/orders.json";
import analyticsSeed from "@/data/analytics.json";

const s = () => useAdminProductsStore.getState();
const apiProduct = (id, over = {}) => ({ id, title: `API ${id}`, description: "An imported product description.", category: "laptops", price: 10, discountPercentage: 0, rating: 4, stock: 5, brand: "Acme", tags: [], thumbnail: "t.png", images: ["a.png"], ...over });
const fields = (over = {}) => ({ title: "New Gadget", description: "A brand new gadget for testing.", category: "laptops", brand: "Zed", price: 999, discountPercentage: 10, stock: 7, ...over });

describe("admin product model", () => {
  it("slugifies names", () => {
    expect(slugify("  Garden Tools & More! ")).toBe("garden-tools-more");
    expect(slugify("***")).toBe("");
  });
  it("recomputes derived fields", () => {
    const p = withDerived({ price: 800, discountPercentage: 20, stock: 0 });
    expect(p).toMatchObject({ originalPrice: 1000, inStock: false });
    expect(withDerived({ price: 10, discountPercentage: 500, stock: 3 }).discountPercentage).toBe(90); // clamped
  });
  it("applies stored edits on top of an API product", () => {
    const state = { ...initialAdminState(), edits: { 1: { price: 500, stock: 0 } } };
    expect(applyEdit(mk(1, { price: 100 }), state)).toMatchObject({ price: 500, inStock: false });
    expect(applyEdit(mk(2), state)).toEqual(mk(2));
  });
  it("builds created products in the normalised shape", () => {
    const p = buildCreatedProduct(FIRST_CREATED_ID, fields(), new Date("2026-11-27T00:00:00Z"));
    expect(p).toMatchObject({ id: 100001, title: "New Gadget", category: "laptops", price: 999, originalPrice: 1110, inStock: true, rating: 0, sku: "SS-100001", thumbnail: "", images: [] });
    expect(p.createdAt).toBe("2026-11-27T00:00:00.000Z");
  });
});

describe("admin products store", () => {
  beforeEach(() => localStorage.clear());
  it("creates products with increasing ids", () => {
    const a = s().createProduct(fields());
    const b = s().createProduct(fields({ title: "Second" }));
    expect([a, b]).toEqual([100001, 100002]);
    expect(s().created).toHaveLength(2);
  });
  it("edits created products fully but imported ones only in allowed fields", () => {
    const id = s().createProduct(fields());
    s().saveEdit(id, { title: "Renamed", category: "tablets", price: 1200 });
    expect(s().created[0]).toMatchObject({ title: "Renamed", category: "tablets", price: 1200 });
    s().saveEdit(5, { price: 700, category: "hacked", title: "T" });
    expect(s().edits[5]).toEqual({ price: 700, title: "T" }); // category is not editable for imported products
  });
  it("updates stock through the same path", () => {
    s().setStock(5, 12);
    expect(s().edits[5].stock).toBe(12);
  });
  it("archives and restores", () => {
    s().archiveProduct(5);
    s().archiveProduct(5);
    expect(s().archivedIds).toEqual([5]);
    expect(isHidden(5, s())).toBe(true);
    s().restoreProduct(5);
    expect(isHidden(5, s())).toBe(false);
  });
  it("refuses to delete a product that an order references, and allows other deletes", () => {
    const referenced = new Set([1, 2]);
    expect(s().deleteProduct(1, referenced)).toBe(false);
    expect(s().deletedIds).toEqual([]);
    expect(s().deleteProduct(50, referenced)).toBe(true);
    expect(s().deletedIds).toEqual([50]);
    const id = s().createProduct(fields());
    expect(s().deleteProduct(id, [])).toBe(true);
    expect(s().created).toHaveLength(0);
    expect(s().deletedIds).toEqual([50]); // a created product leaves no tombstone
  });
  it("reduces stock after an order, summing variants of the same product", () => {
    s().commitOrderStock([{ productId: 1, quantity: 2, stock: 10 }, { productId: 1, quantity: 1, stock: 10 }, { productId: 2, quantity: 5, stock: 3 }]);
    expect(s().edits[1].stock).toBe(7);
    expect(s().edits[2].stock).toBe(0); // never below zero
  });
  it("manages custom categories", () => {
    expect(s().addCategory("x", [])).toMatchObject({ ok: false });
    expect(s().addCategory("Garden Tools", ["laptops"])).toEqual({ ok: true, slug: "garden-tools" });
    expect(s().addCategory("garden tools", ["garden-tools"])).toMatchObject({ ok: false });
    const id = s().createProduct(fields({ category: "garden-tools" }));
    expect(s().renameCategory("garden-tools", "Outdoor Tools", ["laptops"])).toEqual({ ok: true, slug: "outdoor-tools" });
    expect(s().created.find((p) => p.id === id).category).toBe("outdoor-tools");
    expect(s().renameCategory("laptops", "Computers", [])).toMatchObject({ ok: false });
    expect(s().removeCategory("outdoor-tools", ["outdoor-tools"])).toMatchObject({ ok: false }); // in use
    expect(s().removeCategory("laptops", [])).toMatchObject({ ok: false }); // built-in
    s().deleteProduct(id, []);
    expect(s().removeCategory("outdoor-tools", [])).toEqual({ ok: true });
  });
  it("resets every local change", () => {
    s().createProduct(fields());
    s().archiveProduct(3);
    s().resetAdminChanges();
    expect(s()).toMatchObject({ created: [], archivedIds: [], edits: {}, nextId: FIRST_CREATED_ID });
  });
});

describe("overlay lists", () => {
  it("storefront hides deleted and archived products, applies edits and adds created ones", () => {
    useAdminProductsStore.setState({ ...initialAdminState(), deletedIds: [1], archivedIds: [2], edits: { 3: { price: 50 } }, created: [buildCreatedProduct(100001, fields({ category: "tablets" }))] });
    const api = [mk(1), mk(2), mk(3, { price: 999 }), mk(4)];
    const all = storefrontList(api, s(), { includeCreated: true });
    expect(all.map((p) => p.id)).toEqual([3, 4, 100001]);
    expect(all[0].price).toBe(50);
    expect(storefrontList(api, s(), { category: "tablets", includeCreated: true }).map((p) => p.id)).toEqual([3, 4, 100001]); // API list is pre-filtered by the endpoint
    expect(storefrontList(api, s(), { includeCreated: false }).map((p) => p.id)).toEqual([3, 4]);
    expect(storefrontList([], s(), { query: "gadget", includeCreated: true }).map((p) => p.id)).toEqual([100001]);
    expect(storefrontList([], s(), { query: "nothing", includeCreated: true })).toEqual([]);
  });
  it("admin sees archived products flagged and hides only deleted ones", () => {
    useAdminProductsStore.setState({ ...initialAdminState(), deletedIds: [1], archivedIds: [2] });
    const list = adminList([mk(1), mk(2), mk(3)], s());
    expect(list.map((p) => [p.id, p.archived])).toEqual([[2, true], [3, false]]);
  });
});

describe("API layer with local admin changes", () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = (handler) => {
    const fn = vi.fn(async (url) => handler(String(url)));
    vi.stubGlobal("fetch", fn);
    return fn;
  };
  const ok = (json) => ({ ok: true, json: async () => json });

  it("shows edited, created and filtered products in the full catalogue", async () => {
    stub(() => ok({ products: [apiProduct(1), apiProduct(2), apiProduct(3)], total: 3, skip: 0, limit: 0 }));
    useAdminProductsStore.setState({ ...initialAdminState(), edits: { 1: { price: 123, title: "Edited" } }, deletedIds: [2], archivedIds: [3] });
    const id = s().createProduct(fields());
    const { products } = await fetchAllProducts();
    expect(products.map((p) => p.id)).toEqual([1, id]);
    expect(products[0]).toMatchObject({ title: "Edited", price: 123 });
  });
  it("the base catalogue ignores local changes (the admin screens apply them reactively)", async () => {
    stub(() => ok({ products: [apiProduct(1), apiProduct(2)], total: 2, skip: 0, limit: 0 }));
    useAdminProductsStore.setState({ ...initialAdminState(), archivedIds: [2], deletedIds: [1], edits: { 1: { price: 1 } } });
    const { products } = await fetchAllProductsBase();
    expect(products.map((p) => [p.id, p.price])).toEqual([[1, 840], [2, 840]]);
  });
  it("serves created products without any network request", async () => {
    const fn = stub(() => ({ ok: false, status: 500 }));
    const id = s().createProduct(fields());
    expect((await fetchProduct(id)).title).toBe("New Gadget");
    expect(fn).not.toHaveBeenCalled();
  });
  it("treats deleted and archived products as not found, without a request", async () => {
    const fn = stub(() => ok(apiProduct(9)));
    useAdminProductsStore.setState({ ...initialAdminState(), deletedIds: [9], archivedIds: [8] });
    await expect(fetchProduct(9)).rejects.toMatchObject({ status: 404 });
    await expect(fetchProduct(8)).rejects.toMatchObject({ status: 404 });
    expect(fn).not.toHaveBeenCalled();
  });
  it("applies edits to a single product and to searches", async () => {
    stub((u) => (u.includes("/products/search") ? ok({ products: [apiProduct(1)], total: 1, skip: 0, limit: 0 }) : ok(apiProduct(1))));
    s().saveEdit(1, { price: 321, stock: 0 });
    expect(await fetchProduct(1)).toMatchObject({ price: 321, inStock: false });
    s().createProduct(fields({ title: "Quantum Gadget" }));
    const found = await searchAllProducts("gadget");
    expect(found.products.map((p) => p.title)).toEqual(["API 1", "Quantum Gadget"]);
  });
  it("does not request custom categories from the API", async () => {
    const fn = stub(() => ({ ok: false, status: 404 }));
    s().addCategory("Garden Tools", []);
    s().createProduct(fields({ category: "garden-tools" }));
    const { products } = await fetchProductsByCategory("garden-tools", { limit: 0 });
    expect(products).toHaveLength(1);
    expect(fn).not.toHaveBeenCalled();
  });
  it("adds custom categories to the category list", async () => {
    stub(() => ok([{ slug: "laptops", name: "Laptops" }]));
    s().addCategory("Garden Tools", []);
    expect((await fetchCategories()).map((c) => c.slug)).toEqual(["laptops", "garden-tools"]);
  });
});

describe("dashboard metrics", () => {
  const products = [mk(1, { stock: 0 }), mk(2, { stock: 3 }), mk(3, { stock: 50 }), mk(4, { stock: 1, archived: true })];
  it("computes the overview, with archived products counted separately", () => {
    const o = computeOverview({ products, orders: seedOrders, customerCount: 4, seedVisitors: 1000 });
    expect(o).toMatchObject({ totalProducts: 3, archivedProducts: 1, totalOrders: 6, totalCustomers: 4 });
    expect(o.revenue).toBe(seedOrders.reduce((n, x) => n + x.pricing.total, 0));
    expect(o.conversionRate).toBeCloseTo(0.006, 10);
    expect(computeOverview({ products: [], orders: [], customerCount: 0, seedVisitors: 0 }).conversionRate).toBe(0);
  });
  it("ranks top products by units then revenue", () => {
    const top = topProducts(seedOrders, 3);
    // products 1 and 3 both sold 3 units; product 3 earned more, so it ranks first
    expect(top.slice(0, 2).map((t) => [t.productId, t.units])).toEqual([[3, 3], [1, 3]]);
    expect(top.map((t) => t.units)).toEqual([...top.map((t) => t.units)].sort((a, b) => b - a));
  });
  it("lists out-of-stock and low-stock active products, lowest first", () => {
    expect(lowStock(products, 5).map((p) => p.id)).toEqual([1, 2]);
  });
  it("lists the latest order events newest first", () => {
    const events = recentActivity(seedOrders, 5);
    expect(events).toHaveLength(5);
    for (let i = 1; i < events.length; i++) expect(Date.parse(events[i - 1].at)).toBeGreaterThanOrEqual(Date.parse(events[i].at));
  });
  it("filters orders by text, status, customer and date range", () => {
    expect(filterOrders(seedOrders, { query: "demo4" }).map((o) => o.id)).toEqual(["SS-20261110-DEMO4"]);
    expect(filterOrders(seedOrders, { query: "customer@shopsphere" })).toHaveLength(6);
    expect(filterOrders(seedOrders, { status: "delivered" })).toHaveLength(1);
    expect(filterOrders(seedOrders, { customer: "someone-else" })).toHaveLength(0);
    const inRange = filterOrders(seedOrders, { from: "2026-11-15", to: "2026-11-20" });
    expect(inRange.every((o) => o.createdAt >= "2026-11-15" && o.createdAt < "2026-11-21")).toBe(true);
    expect(inRange.length).toBeGreaterThan(0);
    expect(filterOrders(seedOrders, { from: "2030-01-01" })).toHaveLength(0);
  });
  it("filters the product table", () => {
    const list = [mk(1, { title: "Red Chair", category: "furniture", stock: 0 }), mk(2, { title: "Blue Chair", category: "furniture", stock: 3 }), mk(3, { title: "Laptop", stock: 40 }), mk(4, { title: "Old", stock: 9, archived: true })];
    expect(filterAdminProducts(list).map((p) => p.id)).toEqual([1, 2, 3]); // archived hidden by default
    expect(filterAdminProducts(list, { status: "archived" }).map((p) => p.id)).toEqual([4]);
    expect(filterAdminProducts(list, { status: "all" })).toHaveLength(4);
    expect(filterAdminProducts(list, { query: "chair" })).toHaveLength(2);
    expect(filterAdminProducts(list, { category: "furniture", stock: "low" }).map((p) => p.id)).toEqual([2]);
    expect(filterAdminProducts(list, { stock: "out" }).map((p) => p.id)).toEqual([1]);
    expect(filterAdminProducts(list, { stock: "in" }).map((p) => p.id)).toEqual([2, 3]);
  });
  it("finds referenced products, merges seed analytics and lists customers", () => {
    expect([...referencedProductIds(seedOrders)].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    const local = { trending: { impressions: 2, clicks: 1, addToCarts: 0 } };
    expect(mergeStats(local, analyticsSeed.seedStrategyStats, false)).toBe(local);
    const merged = mergeStats(local, analyticsSeed.seedStrategyStats, true);
    expect(merged.trending.impressions).toBe(2 + analyticsSeed.seedStrategyStats.trending.impressions);
    expect(Object.keys(merged)).toHaveLength(9);
    expect(customersFrom([{ id: "a", name: "A", email: "a@x", role: "customer" }, { id: "b", name: "B", email: "b@x", role: "admin" }], [{ id: "c", name: "C", email: "c@x", role: "customer" }]).map((c) => c.id)).toEqual(["a", "c"]);
  });
});

describe("product form validation", () => {
  const good = { title: "Nice Lamp", description: "A really nice lamp for your desk.", brand: "Glow", category: "home-decoration", price: "1499", discountPercentage: "10", stock: "25" };
  const opts = { categorySlugs: ["home-decoration"], editsCategory: true };
  it("accepts a valid form and converts it", () => {
    const r = parseProductForm(good, opts);
    expect(r.errors).toEqual({});
    expect(r.value).toEqual({ title: "Nice Lamp", description: "A really nice lamp for your desk.", brand: "Glow", category: "home-decoration", price: 1499, discountPercentage: 10, stock: 25 });
  });
  it("treats a blank discount as 0 and a blank brand as none", () => {
    expect(parseProductForm({ ...good, discountPercentage: "", brand: "" }, opts).value).toMatchObject({ discountPercentage: 0, brand: null });
  });
  it("reports every invalid field", () => {
    const r = parseProductForm({ title: "ab", description: "short", brand: "x".repeat(61), category: "nope", price: "0", discountPercentage: "95", stock: "-1" }, opts);
    expect(Object.keys(r.errors).sort()).toEqual(["brand", "category", "description", "discountPercentage", "price", "stock", "title"]);
  });
  it("rejects fractional stock and absurd prices", () => {
    expect(parseProductForm({ ...good, stock: "2.5" }, opts).errors.stock).toBeDefined();
    expect(parseProductForm({ ...good, price: "99999999" }, opts).errors.price).toBeDefined();
    expect(parseProductForm({ ...good, price: "abc" }, opts).errors.price).toBeDefined();
  });
  it("does not require a category for imported products", () => {
    expect(parseProductForm({ ...good, category: "" }, { categorySlugs: [], editsCategory: false }).errors).toEqual({});
  });
});
