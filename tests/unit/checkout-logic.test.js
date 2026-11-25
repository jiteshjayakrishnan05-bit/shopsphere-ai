import { describe, it, expect } from "vitest";
import { getDeliveryOptions } from "@/features/checkout/delivery-options";
import { PAYMENT_METHODS, simulatePayment, validatePayment } from "@/features/checkout/mock-payment";
import { calculateTotals, shippingCost } from "@/features/cart/pricing";
import { validateAddress, validateCustomer } from "@/lib/validators";
import { useAddressesStore, addressesForUser } from "@/store/addresses-store";
import { beforeEach } from "vitest";

describe("delivery options", () => {
  const now = new Date(2026, 10, 24);
  it("offers three options with costs and estimated dates", () => {
    const opts = getDeliveryOptions({ taxable: 500, coupon: null, now });
    expect(opts.map((o) => [o.id, o.cost])).toEqual([["economy", 0], ["standard", 99], ["express", 199]]);
    expect(opts[2].minDate).toEqual(new Date(2026, 10, 25));
    expect(opts[2].maxDate).toEqual(new Date(2026, 10, 26));
  });
  it("makes standard free above the threshold or with a shipping coupon", () => {
    expect(getDeliveryOptions({ taxable: 1500, coupon: null, now })[1].cost).toBe(0);
    expect(getDeliveryOptions({ taxable: 100, coupon: { type: "shipping" }, now })[1].cost).toBe(0);
    expect(shippingCost(0, null, false)).toBe(0);
  });
  it("lets checkout override shipping in the totals", () => {
    const lines = [{ unitPrice: 500, quantity: 1 }];
    expect(calculateTotals(lines, null, { shipping: 199 })).toEqual({ subtotal: 500, discount: 0, shipping: 199, tax: 90, total: 789 });
    expect(calculateTotals(lines, null)).toMatchObject({ shipping: 99 });
    expect(calculateTotals([], null, { shipping: 199 }).shipping).toBe(0);
  });
});

describe("mock payment (test mode only)", () => {
  it("lists the three PRD methods", () => expect(PAYMENT_METHODS.map((m) => m.id)).toEqual(["card", "upi", "cod"]));
  it("validates each method's test inputs", () => {
    expect(validatePayment("card", {})).toHaveProperty("testCard");
    expect(validatePayment("card", { testCard: "approve" })).toEqual({});
    expect(validatePayment("upi", { upiId: "9876543210@okbank" })).toHaveProperty("upiId"); // real-looking handles are rejected
    expect(validatePayment("upi", { upiId: "success@test" })).toEqual({});
    expect(validatePayment("cod", {})).toEqual({});
    expect(validatePayment("bitcoin", {})).toHaveProperty("method");
  });
  it("simulates success and failure deterministically", async () => {
    const fast = { delayMs: 0 };
    expect(await simulatePayment("card", { testCard: "approve" }, fast)).toEqual({ ok: true, status: "paid" });
    expect((await simulatePayment("card", { testCard: "decline" }, fast)).ok).toBe(false);
    expect(await simulatePayment("upi", { upiId: "any@test" }, fast)).toEqual({ ok: true, status: "paid" });
    expect((await simulatePayment("upi", { upiId: "fail@test" }, fast)).ok).toBe(false);
    expect(await simulatePayment("cod", {}, fast)).toEqual({ ok: true, status: "cod_pending" });
    expect((await simulatePayment("card", {}, fast)).ok).toBe(false);
  });
  it("never asks for real card data", async () => {
    const src = (await import("@/features/checkout/mock-payment.js?raw")).default;
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); // ignore the explanatory comments
    expect(code).not.toMatch(/cvv|cardNumber|card number|\bpin\b/i);
  });
});

describe("checkout validators", () => {
  it("validates customer details", () => {
    expect(validateCustomer({ name: "Asha Rao", email: "a@b.co", phone: "9876543210" })).toEqual({});
    expect(Object.keys(validateCustomer({ name: "", email: "x", phone: "1" })).sort()).toEqual(["email", "name", "phone"]);
  });
  it("validates addresses", () => {
    const ok = { address: "12 Anna Salai", city: "Chennai", state: "Tamil Nadu", pincode: "600002", country: "India" };
    expect(validateAddress(ok)).toEqual({});
    expect(Object.keys(validateAddress({ address: "x", city: "", state: "", pincode: "123", country: "" })).sort()).toEqual(["address", "city", "country", "pincode", "state"]);
  });
});

describe("addresses store", () => {
  const fields = (over = {}) => ({ label: "Home", address: "12 Anna Salai", city: "Chennai", state: "TN", pincode: "600002", country: "India", isDefault: false, ...over });
  beforeEach(() => {
    localStorage.clear();
    useAddressesStore.setState({ addresses: [] });
  });
  const s = () => useAddressesStore.getState();
  it("makes the first address the default and keeps one default per user", () => {
    const a = s().add("u1", fields());
    const b = s().add("u1", fields({ label: "Work", isDefault: true }));
    s().add("u2", fields());
    const mine = addressesForUser(s().addresses, "u1");
    expect(mine.find((x) => x.id === a).isDefault).toBe(false);
    expect(mine.find((x) => x.id === b).isDefault).toBe(true);
    expect(addressesForUser(s().addresses, "u2")[0].isDefault).toBe(true);
  });
  it("edits, sets default, and promotes another default on delete", () => {
    const a = s().add("u1", fields());
    const b = s().add("u1", fields({ label: "Work" }));
    s().update(b, { city: "Madurai" });
    expect(s().addresses.find((x) => x.id === b).city).toBe("Madurai");
    s().setDefault(b);
    expect(s().addresses.find((x) => x.id === b).isDefault).toBe(true);
    s().remove(b);
    expect(s().addresses.find((x) => x.id === a).isDefault).toBe(true);
  });
});
