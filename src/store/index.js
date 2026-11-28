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
import { useRecAnalyticsStore } from "./recommendation-analytics-store";
import { useAssistantStore } from "./assistant-store";
import { useAdminProductsStore } from "./admin-products-store";
import { useReviewsStore } from "./reviews-store";

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
  useRecAnalyticsStore,
  useAssistantStore,
  useAdminProductsStore,
  useReviewsStore,
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
  useRecAnalyticsStore,
  useAssistantStore,
  useAdminProductsStore,
  useReviewsStore,
};
export { selectCartCount, selectProductQuantity, clampQuantity, lineIdOf } from "./cart-store";
export { ordersForUser } from "./orders-store";
export { addressesForUser } from "./addresses-store";
