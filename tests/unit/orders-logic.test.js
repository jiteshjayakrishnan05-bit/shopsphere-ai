import { describe, it, expect, beforeEach } from "vitest";
import { ORDER_STATUSES, nextStatus, advanceOrder, statusIndex, statusLabel } from "@/features/orders/order-lifecycle";
import { buildOrder, generateOrderId } from "@/features/orders/order-builder";
import { useOrdersStore, ordersForUser } from "@/store/orders-store";
import seed from "@/data/orders.json";

describe("order lifecycle", () => {
  it("has the six PRD stages in order", () => {
    expect(ORDER_STATUSES.map((s) => s.label)).toEqual(["Order placed", "Confirmed", "Packed", "Shipped", "Out for delivery", "Delivered"]);
  });
  it("moves one stage at a time and stops at delivered", () => {
    expect(nextStatus("placed")).toBe("confirmed");
    expect(nextStatus("out_for_delivery")).toBe("delivered");
    expect(nextStatus("delivered")).toBeNull();
    expect(nextStatus("nonsense")).toBeNull();
    expect(statusIndex("packed")).toBe(2);
    expect(statusLabel("shipped")).toBe("Shipped");
  });
  it("advances an order and timestamps the new stage without mutating the original", () => {
    const o = { status: "placed", timeline: [{ status: "placed", at: "2026-11-01T00:00:00.000Z" }], payment: { status: "paid" } };
    const next = advanceOrder(o, new Date("2026-11-02T10:00:00Z"));
    expect(next.status).toBe("confirmed");
    expect(next.timeline).toHaveLength(2);
    expect(next.timeline[1]).toEqual({ status: "confirmed", at: "2026-11-02T10:00:00.000Z" });
    expect(o.timeline).toHaveLength(1);
  });
  it("returns the same order once delivered", () => {
    const o = { status: "delivered", timeline: [], payment: {} };
    expect(advanceOrder(o)).toBe(o);
  });
  it("marks cash-on-delivery as paid when delivered", () => {
    const o = { status: "out_for_delivery", timeline: [], payment: { method: "cod", status: "cod_pending" } };
    expect(advanceOrder(o).payment.status).toBe("paid");
  });
});

describe("seed orders", () => {
  it("cover every tracking stage with consistent timelines and totals", () => {
    expect(seed.map((o) => o.status).sort()).toEqual(ORDER_STATUSES.map((s) => s.id).sort());
    for (const o of seed) {
      expect(o.timeline).toHaveLength(statusIndex(o.status) + 1);
      const subtotal = o.items.reduce((n, i) => n + i.price * i.quantity, 0);
      expect(o.pricing.subtotal).toBe(subtotal);
      expect(o.pricing.total).toBe(subtotal - o.pricing.discount + o.pricing.shipping + o.pricing.tax);
      expect(o.payment.testMode).toBe(true);
    }
  });
});

describe("order builder", () => {
  const now = new Date(2026, 10, 24, 10, 30);
  it("generates readable ids deterministically", () => {
    expect(generateOrderId(now, () => 0)).toBe("SS-20261124-00000");
    expect(generateOrderId(now, () => 0.5)).toMatch(/^SS-20261124-[0-9A-Z]{5}$/);
  });
  it("copies prices and details so history never changes", () => {
    const order = buildOrder({
      user: { id: "u1" },
      lines: [{ unitPrice: 840, item: { productId: 3, quantity: 2, variant: "M", snapshot: { title: "Shirt", thumbnail: "t.png" } } }],
      totals: { subtotal: 1680, discount: 0, shipping: 0, tax: 302, total: 1982 },
      couponCode: null,
      customer: { name: " Asha ", email: "a@b.co ", phone: "9876543210" },
      address: { address: "1 Main Rd", city: "Chennai", state: "TN", pincode: "600001", country: "India" },
      delivery: { id: "standard", label: "Standard delivery", minDays: 3, maxDays: 5, cost: 0 },
      payment: { method: "upi", label: "Mock UPI", status: "paid" },
      now, id: "SS-TEST",
    });
    expect(order).toMatchObject({ id: "SS-TEST", userId: "u1", status: "placed" });
    expect(order.items[0]).toEqual({ productId: 3, title: "Shirt", thumbnail: "t.png", price: 840, quantity: 2, variant: "M" });
    expect(order.customer.name).toBe("Asha");
    expect(order.timeline).toEqual([{ status: "placed", at: now.toISOString() }]);
    expect(new Date(order.expectedDelivery)).toEqual(new Date(2026, 10, 29));
    expect(order.payment.testMode).toBe(true);
  });
});

describe("orders store", () => {
  beforeEach(() => {
    localStorage.clear();
    useOrdersStore.setState({ orders: seed });
  });
  it("adds new orders first and advances an order by id", () => {
    useOrdersStore.getState().addOrder({ id: "NEW", userId: "u1", status: "placed", timeline: [{ status: "placed", at: "x" }], payment: {} });
    expect(useOrdersStore.getState().orders[0].id).toBe("NEW");
    useOrdersStore.getState().advance("NEW");
    expect(useOrdersStore.getState().orders[0].status).toBe("confirmed");
  });
  it("shows customers only their own orders and admins everything", () => {
    const orders = [...seed, { id: "OTHER", userId: "u9" }];
    expect(ordersForUser(orders, { id: "demo-customer", role: "customer" })).toHaveLength(seed.length);
    expect(ordersForUser(orders, { id: "u9", role: "customer" }).map((o) => o.id)).toEqual(["OTHER"]);
    expect(ordersForUser(orders, { id: "demo-admin", role: "admin" })).toHaveLength(orders.length);
    expect(ordersForUser(orders, null)).toEqual([]);
  });
});
