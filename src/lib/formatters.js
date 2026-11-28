import { USD_TO_INR_RATE } from "./constants";

/**
 * Convert a USD amount from DummyJSON into whole demo-INR rupees.
 * @param {number} usd
 * @returns {number}
 */
export function toInr(usd) {
  const n = Number(usd);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * USD_TO_INR_RATE);
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Format an INR amount, e.g. 150000 -> "₹1,50,000".
 * @param {number} amount
 */
export function formatPrice(amount) {
  const n = Number(amount);
  return inrFormatter.format(Number.isFinite(n) ? n : 0);
}

/**
 * Original price implied by a discount percentage.
 * @param {number} price current (discounted) price
 * @param {number} discountPercentage 0-100
 */
export function originalPriceFrom(price, discountPercentage) {
  const d = Number(discountPercentage);
  if (!Number.isFinite(d) || d <= 0 || d >= 100) return price;
  return Math.round(price / (1 - d / 100));
}

/** Discount percentage between an original and current price (rounded). */
export function discountPercent(originalPrice, price) {
  if (!(originalPrice > 0) || price >= originalPrice) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/** Truncate long text safely for display. */
export function truncate(text, max = 80) {
  const s = String(text ?? "");
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** "smart-phones" -> "Smart Phones" */
export function formatCategory(slug) {
  return String(slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** "24 Nov 2026, 3:30 pm" in the viewer's timezone. */
export const formatDateTime = (iso) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** "Thu, 27 Nov" */
export const formatShortDate = (d) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(d instanceof Date ? d : new Date(d));

/** "3 Nov 2026" */
export const formatDay = (iso) => (iso ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : "");
