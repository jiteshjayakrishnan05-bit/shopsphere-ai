import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore, clampQuantity, selectCartCount } from "@/store/cart-store";

const product = (over = {}) => ({ id: 1, title: "Phone", price: 1000, thumbnail: "", stock: 5, category: "smartphones", ...over });

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], savedForLater: [] });
});

describe("cart store", () => {
  it("clamps quantities to stock", () => {
    expect(clampQuantity(10, 5)).toBe(5);
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(3, 5)).toBe(3);
  });
  it("increments the existing line for duplicate products", () => {
    const { addItem } = useCartStore.getState();
    addItem(product(), 1);
    addItem(product(), 2);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });
  it("never exceeds stock when adding", () => {
    const { addItem } = useCartStore.getState();
    addItem(product(), 4);
    addItem(product(), 4);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });
  it("updates quantity within stock and removes lines", () => {
    const s = useCartStore.getState();
    s.addItem(product(), 1);
    s.setQuantity(1, 99);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    s.removeItem(1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
  it("counts total units", () => {
    const s = useCartStore.getState();
    s.addItem(product({ id: 1 }), 2);
    s.addItem(product({ id: 2 }), 3);
    expect(selectCartCount(useCartStore.getState())).toBe(5);
  });
});
