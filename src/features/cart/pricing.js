import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT, TAX_RATE } from "@/lib/constants";

/** Discount amount (whole INR) a coupon gives on a subtotal. Shipping coupons give no item discount. */
export function couponDiscount(coupon, subtotal) {
  if (!coupon || subtotal <= 0) return 0;
  if (coupon.type === "percent") {
    const raw = Math.round((subtotal * coupon.value) / 100);
    return Math.min(raw, coupon.maxDiscount ?? raw, subtotal);
  }
  if (coupon.type === "flat") return Math.min(coupon.value, subtotal);
  return 0;
}

/**
 * Cart totals. Money is whole INR; tax is rounded once.
 * @param {{unitPrice: number, quantity: number}[]} lines payable lines only
 * @param {import("./coupons").Coupon|null} coupon an already-validated coupon
 */
export function calculateTotals(lines, coupon = null) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = couponDiscount(coupon, subtotal);
  const taxable = subtotal - discount;
  const freeShipping = coupon?.type === "shipping" || taxable >= FREE_SHIPPING_THRESHOLD;
  const shipping = lines.length === 0 || freeShipping ? 0 : SHIPPING_FLAT;
  const tax = Math.round(taxable * TAX_RATE);
  return { subtotal, discount, shipping, tax, total: taxable + shipping + tax };
}
