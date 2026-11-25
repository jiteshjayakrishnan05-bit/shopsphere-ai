import { useAuthStore } from "./auth-store";
import { useCartStore } from "./cart-store";
import { useWishlistStore } from "./wishlist-store";
import { useRecentlyViewedStore } from "./recently-viewed-store";
import { useCompareStore } from "./compare-store";
import { useCheckoutStore } from "./checkout-store";
import { useUsersStore } from "./users-store";
import { useSearchHistoryStore } from "./search-history-store";
import { useOrdersStore } from "./orders-store";
import { useAddressesStore } from "./addresses-store";

/** Every persisted store, so hydration and cross-tab sync can treat them uniformly. */
export const persistedStores = [
  useAuthStore,
  useCartStore,
  useWishlistStore,
  useRecentlyViewedStore,
  useCompareStore,
  useCheckoutStore,
  useUsersStore,
  useSearchHistoryStore,
  useOrdersStore,
  useAddressesStore,
];

export {
  useAuthStore,
  useCartStore,
  useWishlistStore,
  useRecentlyViewedStore,
  useCompareStore,
  useCheckoutStore,
  useUsersStore,
  useSearchHistoryStore,
  useOrdersStore,
  useAddressesStore,
};
export { selectCartCount, selectProductQuantity, clampQuantity, lineIdOf } from "./cart-store";
export { ordersForUser } from "./orders-store";
export { addressesForUser } from "./addresses-store";
