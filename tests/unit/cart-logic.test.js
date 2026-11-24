import { describe, it, expect } from "vitest";
import { evaluateCoupon, COUPONS } from "@/features/cart/coupons";
import { calculateTotals, couponDiscount } from "@/features/cart/pricing";
import { reconcileLine, canCheckout, isPayable } from "@/features/cart/cart-reconcile";

const NOW = Date.parse("2026-11-24T10:00:00");
const line = (unitPrice, quantity) => ({ unitPrice, quantity });

describe("evaluateCoupon", () => {
  it("accepts a valid code case-insensitively", () => {
    expect(evaluateCoupon(" welcome10 ", 1000, NOW)).toMatchObject({ status: "valid", coupon: { code: "WELCOME10" } });
  });
  it("rejects unknown and empty codes", () => {
    expect(evaluateCoupon("NOPE", 1000, NOW).status).toBe("invalid");
    expect(evaluateCoupon("", 1000, NOW).status).toBe("invalid");
  });
  it("reports expired coupons", () => {
    const r = evaluateCoupon("SUMMER25", 1000, NOW);
    expect(r.status).toBe("expired");
    expect(r.message).toContain("expired");
  });
  it("enforces minimum subtotal", () => {
    expect(evaluateCoupon("SAVE200", 1000, NOW).status).toBe("min_subtotal");
    expect(evaluateCoupon("SAVE200", 1500, NOW).status).toBe("valid");
  });
  it("has at least one coupon of each outcome for demos", () => {
    expect(COUPONS.length).toBeGreaterThanOrEqual(4);
  });
});

describe("calculateTotals", () => {
  it("returns zeros for an empty cart", () => {
    expect(calculateTotals([])).toEqual({ subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 });
  });
  it("adds flat shipping and 18% tax below the free-shipping threshold", () => {
    // 500: shipping 99, tax 90 -> 689
    expect(calculateTotals([line(250, 2)])).toEqual({ subtotal: 500, discount: 0, shipping: 99, tax: 90, total: 689 });
  });
  it("gives free shipping at the threshold", () => {
    expect(calculateTotals([line(999, 1)]).shipping).toBe(0);
  });
  it("applies a percent coupon with its cap", () => {
    const welcome = COUPONS.find((c) => c.code === "WELCOME10");
    expect(couponDiscount(welcome, 2000)).toBe(200);
    expect(couponDiscount(welcome, 10000)).toBe(500);
    const t = calculateTotals([line(2000, 1)], welcome);
    expect(t).toMatchObject({ subtotal: 2000, discount: 200, shipping: 0, tax: 324, total: 2124 });
  });
  it("never discounts more than the subtotal", () => {
    expect(couponDiscount({ type: "flat", value: 200 }, 150)).toBe(150);
  });
  it("makes shipping free with a shipping coupon", () => {
    const ship = COUPONS.find((c) => c.code === "FREESHIP");
    expect(calculateTotals([line(100, 1)], ship).shipping).toBe(0);
  });
});

const item = (over = {}) => ({ lineId: "1", productId: 1, variant: null, quantity: 2, snapshot: { price: 1000, stock: 5, title: "P" }, ...over });
const product = (over = {}) => ({ id: 1, price: 1000, stock: 5, inStock: true, ...over });

describe("reconcileLine", () => {
  it("is ok when live data matches", () => expect(reconcileLine(item(), { product: product() }).status).toBe("ok"));
  it("is checking while loading", () => expect(reconcileLine(item(), { isPending: true }).status).toBe("checking"));
  it("flags out of stock", () => expect(reconcileLine(item(), { product: product({ stock: 0, inStock: false }) }).status).toBe("out_of_stock"));
  it("flags quantity above stock with the available amount", () => {
    expect(reconcileLine(item({ quantity: 4 }), { product: product({ stock: 2 }) })).toMatchObject({ status: "quantity_exceeds", available: 2 });
  });
  it("flags price changes with old and new prices", () => {
    expect(reconcileLine(item(), { product: product({ price: 1200 }) })).toMatchObject({ status: "price_changed", oldPrice: 1000, newPrice: 1200, unitPrice: 1200 });
  });
  it("treats a 404 as unavailable and other errors as stale (snapshot used)", () => {
    expect(reconcileLine(item(), { error: { status: 404 } }).status).toBe("unavailable");
    const stale = reconcileLine(item(), { error: { status: undefined } });
    expect(stale).toMatchObject({ status: "stale", unitPrice: 1000 });
  });
});

describe("checkout gating", () => {
  const l = (status) => ({ status });
  it("blocks empty carts and blocking statuses", () => {
    expect(canCheckout([])).toBe(false);
    for (const s of ["unavailable", "out_of_stock", "price_changed", "quantity_exceeds", "checking"]) expect(canCheckout([l("ok"), l(s)])).toBe(false);
  });
  it("allows ok and stale lines", () => expect(canCheckout([l("ok"), l("stale")])).toBe(true));
  it("excludes unavailable and out-of-stock lines from payable", () => {
    expect(isPayable(l("unavailable"))).toBe(false);
    expect(isPayable(l("out_of_stock"))).toBe(false);
    expect(isPayable(l("price_changed"))).toBe(true);
  });
});
