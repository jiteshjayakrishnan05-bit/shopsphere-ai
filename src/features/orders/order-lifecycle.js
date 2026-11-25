/** The six simulated fulfilment stages (PRD §5.8). Tracking is simulated; no real courier is involved. */
export const ORDER_STATUSES = Object.freeze([
  { id: "placed", label: "Order placed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
]);

export const statusIndex = (status) => ORDER_STATUSES.findIndex((s) => s.id === status);
export const statusLabel = (status) => ORDER_STATUSES[statusIndex(status)]?.label ?? status;

/** The stage after `status`, or null when already delivered (or unknown). */
export function nextStatus(status) {
  const i = statusIndex(status);
  return i === -1 || i === ORDER_STATUSES.length - 1 ? null : ORDER_STATUSES[i + 1].id;
}

/**
 * Move an order to its next stage and timestamp it. Returns the same order when it cannot advance.
 * Delivering a cash-on-delivery order marks its payment as collected.
 */
export function advanceOrder(order, now = new Date()) {
  const next = nextStatus(order.status);
  if (!next) return order;
  const payment =
    next === "delivered" && order.payment?.status === "cod_pending" ? { ...order.payment, status: "paid" } : order.payment;
  return { ...order, status: next, payment, timeline: [...order.timeline, { status: next, at: now.toISOString() }] };
}
