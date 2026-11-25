import { addDays } from "@/features/products/delivery";
import { shippingCost } from "@/features/cart/pricing";

/** Simulated delivery methods. Standard follows the cart shipping rule; the others have fixed prices. */
const OPTIONS = [
  { id: "economy", label: "Economy delivery", minDays: 6, maxDays: 8, flatCost: 0 },
  { id: "standard", label: "Standard delivery", minDays: 3, maxDays: 5, flatCost: null },
  { id: "express", label: "Express delivery", minDays: 1, maxDays: 2, flatCost: 199 },
];

/**
 * @param {{taxable: number, coupon: import("@/features/cart/coupons").Coupon|null, now?: Date}} args
 */
export function getDeliveryOptions({ taxable, coupon, now = new Date() }) {
  return OPTIONS.map((o) => ({
    id: o.id,
    label: o.label,
    minDays: o.minDays,
    maxDays: o.maxDays,
    cost: o.flatCost ?? shippingCost(taxable, coupon),
    minDate: addDays(now, o.minDays),
    maxDate: addDays(now, o.maxDays),
  }));
}

export const DEFAULT_DELIVERY_ID = "standard";
