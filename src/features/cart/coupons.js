import { formatPrice } from "@/lib/formatters";

/**
 * Mock coupon codes (demo only). `expiresAt` is an ISO date; a coupon is expired after that day ends.
 * @typedef {{code: string, type: "percent"|"flat"|"shipping", value: number, minSubtotal: number,
 *   maxDiscount?: number, expiresAt?: string, description: string}} Coupon
 * @type {Coupon[]}
 */
export const COUPONS = [
  { code: "WELCOME10", type: "percent", value: 10, maxDiscount: 500, minSubtotal: 0, description: "10% off, up to ₹500" },
  { code: "SAVE200", type: "flat", value: 200, minSubtotal: 1500, description: "₹200 off orders of ₹1,500 or more" },
  { code: "FREESHIP", type: "shipping", value: 0, minSubtotal: 0, description: "Free shipping" },
  { code: "SUMMER25", type: "percent", value: 25, minSubtotal: 0, expiresAt: "2025-08-31", description: "25% off (summer sale)" },
];

/**
 * Check a code against the current subtotal.
 * @returns {{status: "valid", coupon: Coupon} | {status: "invalid"|"expired"|"min_subtotal", message: string}}
 */
export function evaluateCoupon(code, subtotal, now = Date.now()) {
  const normalized = String(code ?? "").trim().toUpperCase();
  if (!normalized) return { status: "invalid", message: "Enter a coupon code." };
  const coupon = COUPONS.find((c) => c.code === normalized);
  if (!coupon) return { status: "invalid", message: `“${normalized}” isn't a valid coupon code.` };
  if (coupon.expiresAt && now > Date.parse(`${coupon.expiresAt}T23:59:59`)) {
    return { status: "expired", message: `${coupon.code} expired on ${coupon.expiresAt}.` };
  }
  if (subtotal < coupon.minSubtotal) {
    return {
      status: "min_subtotal",
      message: `${coupon.code} needs a subtotal of at least ${formatPrice(coupon.minSubtotal)}.`,
    };
  }
  return { status: "valid", coupon };
}
