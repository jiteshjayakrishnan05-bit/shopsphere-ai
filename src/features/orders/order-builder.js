import { addDays } from "@/features/products/delivery";

const pad = (n) => String(n).padStart(2, "0");

/** e.g. SS-20261124-K3J9Q. `rand` is injectable so tests are deterministic. */
export function generateOrderId(now = new Date(), rand = Math.random) {
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const suffix = Math.floor(rand() * 36 ** 5).toString(36).toUpperCase().padStart(5, "0");
  return `SS-${date}-${suffix}`;
}

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} userId
 * @property {string} createdAt ISO
 * @property {string} status one of ORDER_STATUSES
 * @property {{status: string, at: string}[]} timeline
 * @property {{productId: number, title: string, thumbnail: string, price: number, quantity: number, variant: string|null}[]} items
 * @property {{subtotal: number, discount: number, shipping: number, tax: number, total: number}} pricing
 * @property {string|null} couponCode
 * @property {{name: string, email: string, phone: string}} customer
 * @property {{address: string, city: string, state: string, pincode: string, country: string}} address
 * @property {{id: string, label: string, minDays: number, maxDays: number, cost: number}} delivery
 * @property {{method: string, label: string, status: "paid"|"cod_pending", testMode: true}} payment
 * @property {string} expectedDelivery ISO
 */

/** Build a new order from checkout data. Prices are copied so later catalogue changes never alter history. */
export function buildOrder({ user, lines, totals, couponCode, customer, address, delivery, payment, now = new Date(), id }) {
  return {
    id: id ?? generateOrderId(now),
    userId: String(user.id),
    createdAt: now.toISOString(),
    status: "placed",
    timeline: [{ status: "placed", at: now.toISOString() }],
    items: lines.map((l) => ({
      productId: l.item.productId,
      title: l.item.snapshot.title,
      thumbnail: l.item.snapshot.thumbnail,
      price: l.unitPrice,
      quantity: l.item.quantity,
      variant: l.item.variant,
    })),
    pricing: { ...totals },
    couponCode: couponCode ?? null,
    customer: { name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone.trim() },
    address: {
      address: address.address.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim(),
      country: address.country.trim(),
    },
    delivery: { id: delivery.id, label: delivery.label, minDays: delivery.minDays, maxDays: delivery.maxDays, cost: delivery.cost },
    payment: { method: payment.method, label: payment.label, status: payment.status, testMode: true },
    expectedDelivery: addDays(now, delivery.maxDays).toISOString(),
  };
}
