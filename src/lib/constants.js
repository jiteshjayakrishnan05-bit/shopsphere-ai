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

export const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // mock session lasts 2 hours
export const POPULAR_SEARCHES = ["smartphone", "laptop", "headphones", "sunglasses", "fragrance", "watch"];

export const SORT_OPTIONS = Object.freeze([
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
]);

// Cart pricing rules (demo values, INR). Centralised so totals are computed in one place.
export const SHIPPING_FLAT = 99;
export const FREE_SHIPPING_THRESHOLD = 999; // free shipping when subtotal after discount reaches this
export const TAX_RATE = 0.18; // simulated GST, added on top of the discounted subtotal
export const LOW_STOCK_THRESHOLD = 5;

export const ROLES = Object.freeze({ CUSTOMER: "customer", ADMIN: "admin" });

export const STORAGE_KEYS = Object.freeze({
  auth: "shopsphere-auth",
  cart: "shopsphere-cart",
  wishlist: "shopsphere-wishlist",
  checkout: "shopsphere-checkout",
  recentlyViewed: "shopsphere-recently-viewed",
  compare: "shopsphere-compare",
  users: "shopsphere-users",
  searchHistory: "shopsphere-search-history",
  orders: "shopsphere-orders",
  addresses: "shopsphere-addresses",
  recAnalytics: "shopsphere-rec-analytics",
});
