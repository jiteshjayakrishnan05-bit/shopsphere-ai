import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";
import seedOrders from "@/data/orders.json";
import { advanceOrder } from "@/features/orders/order-lifecycle";

/**
 * Orders persisted locally. Starts with documented seed orders (data/orders.json) for the demo
 * customer covering every tracking stage; real checkouts are added in front.
 */
export const useOrdersStore = createPersistedStore(
  STORAGE_KEYS.orders,
  (set) => ({
    /** @type {import("@/features/orders/order-builder").Order[]} */
    orders: seedOrders,
    addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
    /** Simulated progression (admin action). */
    advance: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? advanceOrder(o) : o)) })),
  }),
  { version: 1 },
);

/** Customers see their own orders; administrators see all (PRD access table). */
export const ordersForUser = (orders, user) =>
  !user ? [] : user.role === "admin" ? orders : orders.filter((o) => o.userId === String(user.id));
