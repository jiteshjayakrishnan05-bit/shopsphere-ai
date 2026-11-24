import { useAuthStore } from "./auth-store";
import { useCartStore } from "./cart-store";
import { useWishlistStore } from "./wishlist-store";
import { useRecentlyViewedStore } from "./recently-viewed-store";
import { useCompareStore } from "./compare-store";
import { useCheckoutStore } from "./checkout-store";

/** Every persisted store, so hydration and cross-tab sync can treat them uniformly. */
export const persistedStores = [
  useAuthStore,
  useCartStore,
  useWishlistStore,
  useRecentlyViewedStore,
  useCompareStore,
  useCheckoutStore,
];

export { useAuthStore, useCartStore, useWishlistStore, useRecentlyViewedStore, useCompareStore, useCheckoutStore };
