/**
 * Compare a cart line with fresh product data from the API.
 * Statuses, in priority order:
 *  - "checking"          live data not loaded yet
 *  - "stale"             API failed (network/server); last-known snapshot is used
 *  - "unavailable"       product no longer exists (404)
 *  - "out_of_stock"      stock is 0
 *  - "quantity_exceeds"  more units in the cart than are in stock
 *  - "price_changed"     live price differs from the price the customer saw
 *  - "ok"
 * @param {import("@/store/cart-store").CartItem} item
 * @param {{product?: import("@/services/api/normalize-product").Product, error?: {status?: number}, isPending?: boolean}} live
 */
export function reconcileLine(item, live) {
  if (live?.product) {
    const p = live.product;
    if (!p.inStock) return { status: "out_of_stock", unitPrice: item.snapshot.price };
    if (item.quantity > p.stock) return { status: "quantity_exceeds", available: p.stock, unitPrice: p.price };
    if (p.price !== item.snapshot.price) {
      return { status: "price_changed", oldPrice: item.snapshot.price, newPrice: p.price, unitPrice: p.price };
    }
    return { status: "ok", unitPrice: item.snapshot.price };
  }
  if (live?.error) {
    return live.error.status === 404
      ? { status: "unavailable", unitPrice: item.snapshot.price }
      : { status: "stale", unitPrice: item.snapshot.price };
  }
  return { status: "checking", unitPrice: item.snapshot.price };
}

/** Lines that count toward totals (everything except items that can't be bought). */
export const PAYABLE_STATUSES = ["ok", "stale", "price_changed", "quantity_exceeds", "checking"];
/** Statuses that block checkout until the customer resolves them. */
export const BLOCKING_STATUSES = ["unavailable", "out_of_stock", "price_changed", "quantity_exceeds", "checking"];

export const isPayable = (line) => PAYABLE_STATUSES.includes(line.status) && line.status !== "unavailable";
export const canCheckout = (lines) => lines.length > 0 && lines.every((l) => !BLOCKING_STATUSES.includes(l.status));
