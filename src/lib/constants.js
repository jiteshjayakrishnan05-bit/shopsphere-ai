/**
 * Central application constants. Keep magic numbers here, never in components.
 */
export const APP_NAME = "ShopSphere AI";
export const APP_TAGLINE = "Personalized Shopping, Powered by Intelligence";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://dummyjson.com";

/**
 * DummyJSON prices are in USD. The storefront presents INR (PRD §10).
 * This is a fixed DEMO rate, not a live exchange rate. All conversion goes
 * through formatters.toInr() so the rate lives in exactly one place.
 */
export const USD_TO_INR_RATE = 84;

export const API_TIMEOUT_MS = 10_000;
export const PAGE_SIZE = 24;
export const SEARCH_DEBOUNCE_MS = 350;
export const MAX_SEARCH_QUERY_LENGTH = 100;

export const ROLES = Object.freeze({ CUSTOMER: "customer", ADMIN: "admin" });

export const STORAGE_KEYS = Object.freeze({
  auth: "shopsphere-auth",
  cart: "shopsphere-cart",
  wishlist: "shopsphere-wishlist",
  checkout: "shopsphere-checkout",
  recentlyViewed: "shopsphere-recently-viewed",
  compare: "shopsphere-compare",
});
