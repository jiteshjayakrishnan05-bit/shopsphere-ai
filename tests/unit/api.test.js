import { describe, it, expect, vi, afterEach } from "vitest";
import { apiGet, ApiError, shouldRetry } from "@/services/api/api-client";
import { normalizeProduct, normalizeProductList } from "@/services/api/normalize-product";

afterEach(() => vi.unstubAllGlobals());

const rawProduct = {
  id: 1, title: "Mascara", description: "d", category: "beauty", price: 10, discountPercentage: 20,
  rating: 4.5, stock: 3, brand: "Essence", tags: ["beauty"], thumbnail: "t.png", images: ["a.png"],
};

describe("normalizeProduct", () => {
  it("maps fields and converts price to demo INR", () => {
    const p = normalizeProduct(rawProduct);
    expect(p.price).toBe(840);
    expect(p.originalPrice).toBe(1050);
    expect(p.inStock).toBe(true);
    expect(p.images).toEqual(["a.png"]);
  });
  it("marks zero stock as out of stock", () => {
    expect(normalizeProduct({ ...rawProduct, stock: 0 }).inStock).toBe(false);
  });
  it("rejects malformed payloads with a parse error", () => {
    expect(() => normalizeProduct({})).toThrow(ApiError);
    expect(() => normalizeProductList({ nope: true })).toThrow(ApiError);
  });
});

describe("apiGet", () => {
  it("returns parsed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) }));
    await expect(apiGet("/x")).resolves.toEqual({ a: 1 });
  });
  it("maps 404 to a friendly http error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(apiGet("/x")).rejects.toMatchObject({ kind: "http", status: 404 });
  });
  it("maps fetch failures to a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    await expect(apiGet("/x")).rejects.toMatchObject({ kind: "network" });
  });
  it("maps invalid JSON to a parse error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error("bad"); } }));
    await expect(apiGet("/x")).rejects.toMatchObject({ kind: "parse" });
  });
  it("reports caller cancellation as aborted", async () => {
    const ctrl = new AbortController();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => { ctrl.abort(); return Promise.reject(new DOMException("a", "AbortError")); }));
    await expect(apiGet("/x", { signal: ctrl.signal })).rejects.toMatchObject({ kind: "aborted" });
  });
});

describe("shouldRetry", () => {
  it("does not retry 4xx or aborted requests", () => {
    expect(shouldRetry(0, new ApiError("x", { status: 404 }))).toBe(false);
    expect(shouldRetry(0, new ApiError("x", { kind: "aborted" }))).toBe(false);
  });
  it("retries transient failures up to twice", () => {
    const e = new ApiError("x", { kind: "network" });
    expect(shouldRetry(0, e)).toBe(true);
    expect(shouldRetry(1, e)).toBe(true);
    expect(shouldRetry(2, e)).toBe(false);
  });
});
