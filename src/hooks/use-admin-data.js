"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { adminList } from "@/services/api/admin-overlay";
import { fetchAllProductsBase } from "@/services/api/product-api";
import { useAdminProductsStore } from "@/store";

/**
 * The catalogue as the administrator sees it: the DummyJSON products (cached) with local changes applied
 * reactively. Archived products are included and flagged; deleted ones are not.
 */
export function useAdminCatalogue() {
  const query = useQuery({ queryKey: [...queryKeys.products.all, "admin-base"], queryFn: ({ signal }) => fetchAllProductsBase({ signal }), staleTime: 10 * 60 * 1000 });
  const created = useAdminProductsStore((s) => s.created);
  const edits = useAdminProductsStore((s) => s.edits);
  const deletedIds = useAdminProductsStore((s) => s.deletedIds);
  const archivedIds = useAdminProductsStore((s) => s.archivedIds);
  const products = useMemo(
    () => (query.data ? adminList(query.data.products, { created, edits, deletedIds, archivedIds }) : []),
    [query.data, created, edits, deletedIds, archivedIds],
  );
  return { products, isPending: query.isPending, isError: query.isError, error: query.error, refetch: query.refetch };
}

/** After an admin change, refresh what customers see (catalogue, product pages, carts, recommendations). */
export function useRefreshStorefront() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
  }, [queryClient]);
}
