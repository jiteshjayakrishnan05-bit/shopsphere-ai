import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore, clampQuantity, selectCartCount, selectProductQuantity, lineIdOf } from "@/store/cart-store";

const product = (over = {}) => ({ id: 1, title: "Phone", price: 1000, thumbnail: "", stock: 5, category: "smartphones", ...over });
const s = () => useCartStore.getState();

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], savedForLater: [], couponCode: null });
});

describe("cart store: lines and stock", () => {
  it("clamps quantities to stock", () => {
    expect(clampQuantity(10, 5)).toBe(5);
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(3, 5)).toBe(3);
  });
  it("builds line ids from product and variant", () => {
    expect(lineIdOf(4)).toBe("4");
    expect(lineIdOf(4, "M")).toBe("4:M");
  });
  it("increments the existing line for duplicate products", () => {
    s().addItem(product(), 1);
    s().addItem(product(), 2);
    expect(s().items).toHaveLength(1);
    expect(s().items[0].quantity).toBe(3);
  });
  it("never exceeds stock when adding", () => {
    s().addItem(product(), 4);
    s().addItem(product(), 4);
    expect(s().items[0].quantity).toBe(5);
  });
  it("updates quantity within stock and removes lines", () => {
    s().addItem(product(), 1);
    s().setQuantity("1", 99);
    expect(s().items[0].quantity).toBe(5);
    s().removeItem("1");
    expect(s().items).toHaveLength(0);
  });
  it("counts total units", () => {
    s().addItem(product({ id: 1 }), 2);
    s().addItem(product({ id: 2 }), 3);
    expect(selectCartCount(s())).toBe(5);
  });
});

describe("cart store: variants share stock", () => {
  it("keeps separate lines per variant but limits the combined total to stock", () => {
    s().addItem(product({ stock: 4 }), 3, "M");
    s().addItem(product({ stock: 4 }), 3, "L"); // only 1 left across variants
    expect(s().items.map((i) => [i.lineId, i.quantity])).toEqual([["1:M", 3], ["1:L", 1]]);
    expect(selectProductQuantity(1)(s())).toBe(4);
  });
  it("does not add when no stock remains for the product", () => {
    s().addItem(product({ stock: 2 }), 2, "M");
    s().addItem(product({ stock: 2 }), 1, "L");
    expect(s().items).toHaveLength(1);
  });
  it("limits setQuantity by units held in other variants", () => {
    s().addItem(product({ stock: 5 }), 3, "M");
    s().addItem(product({ stock: 5 }), 1, "L");
    s().setQuantity("1:L", 10);
    expect(s().items.find((i) => i.lineId === "1:L").quantity).toBe(2);
  });
});

describe("cart store: save for later and coupon", () => {
  it("saves for later and moves back", () => {
    s().addItem(product(), 2);
    s().saveForLater("1");
    expect(s().items).toHaveLength(0);
    expect(s().savedForLater).toHaveLength(1);
    s().moveToCart("1");
    expect(s().items[0].quantity).toBe(2);
    expect(s().savedForLater).toHaveLength(0);
  });
  it("merges a saved line into an existing cart line without exceeding stock", () => {
    s().addItem(product({ stock: 3 }), 2);
    s().saveForLater("1");
    s().addItem(product({ stock: 3 }), 2);
    s().moveToCart("1");
    expect(s().items).toHaveLength(1);
    expect(s().items[0].quantity).toBe(3);
  });
  it("keeps an out-of-stock saved item saved", () => {
    s().addItem(product(), 1);
    s().saveForLater("1");
    useCartStore.setState((st) => ({ savedForLater: st.savedForLater.map((i) => ({ ...i, snapshot: { ...i.snapshot, stock: 0 } })) }));
    s().moveToCart("1");
    expect(s().items).toHaveLength(0);
    expect(s().savedForLater).toHaveLength(1);
  });
  it("stores and clears the coupon code; clear() resets it", () => {
    s().setCoupon("WELCOME10");
    expect(s().couponCode).toBe("WELCOME10");
    s().clear();
    expect(s().couponCode).toBeNull();
  });
});

describe("cart store: live data", () => {
  it("clamps quantities when live stock drops and updates the snapshot", () => {
    s().addItem(product(), 5);
    s().applyLiveStock(1, 2);
    expect(s().items[0].quantity).toBe(2);
    expect(s().items[0].snapshot.stock).toBe(2);
  });
  it("keeps the line (and quantity) when the product is out of stock", () => {
    s().addItem(product(), 3);
    s().applyLiveStock(1, 0);
    expect(s().items[0].quantity).toBe(3);
    expect(s().items[0].snapshot.stock).toBe(0);
  });
  it("accepts a new price", () => {
    s().addItem(product(), 1);
    s().acceptPrice(1, 1200);
    expect(s().items[0].snapshot.price).toBe(1200);
  });
});
