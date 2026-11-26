"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useCatalogueSource } from "@/hooks/use-catalogue-source";
import { useHydrated } from "@/hooks/use-hydrated";
import { queryKeys } from "@/lib/query-keys";
import { useCartStore, useOrdersStore, useRecentlyViewedStore, useSearchHistoryStore, useWishlistStore } from "@/store";
import { collectSignals, getRecommendations } from "@/services/recommendation/recommendation-service";

/** Current activity signals plus the product catalogue, shared by rails and the preferences page. */
export function usePersonalizationInputs() {
  const hydrated = useHydrated();
  const { user } = useAuth();
  const { data: catalogue, isError } = useCatalogueSource({ type: "all" });
  const viewedIds = useRecentlyViewedStore((s) => s.ids);
  const wishlistIds = useWishlistStore((s) => s.ids);
  const cartItems = useCartStore((s) => s.items);
  const orders = useOrdersStore((s) => s.orders);
  const searchTerms = useSearchHistoryStore((s) => s.terms);
  const signals = useMemo(
    () => collectSignals({ viewedIds, wishlistIds, cartItems, orders, user, searchTerms }),
    [viewedIds, wishlistIds, cartItems, orders, user, searchTerms],
  );
  return { hydrated, catalogue, catalogueFailed: isError && !catalogue, signals };
}

/**
 * Recommendations for one strategy. The UI only ever talks to this hook; scoring lives in the service layer.
 * Waits for stores to rehydrate, so saved activity is never ignored on first paint.
 * @param {string} strategy one of STRATEGY
 * @param {{seed?: object|null, category?: string|null, limit?: number}} [options]
 */
export function useRecommendations(strategy, { seed = null, category = null, limit = 8 } = {}) {
  const { hydrated, catalogue, catalogueFailed, signals } = usePersonalizationInputs();
  const fingerprint = useMemo(() => JSON.stringify(signals), [signals]);
  const query = useQuery({
    queryKey: queryKeys.recommendations(strategy, seed?.id ?? null, category, limit, fingerprint, catalogue?.length ?? 0),
    queryFn: () => getRecommendations({ strategy, catalogue, signals, seed, category, limit }),
    enabled: hydrated && Boolean(catalogue),
    staleTime: Infinity, // results are a pure function of the key, so they only change when activity changes
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  return {
    result: query.data ?? null,
    isLoading: !catalogueFailed && (!hydrated || !catalogue || query.isPending),
    failed: catalogueFailed || query.isError || Boolean(query.data?.error),
  };
}
