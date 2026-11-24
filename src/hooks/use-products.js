"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchProducts, fetchProduct } from "@/services/api/product-api";
import { fetchCategories } from "@/services/api/category-api";

/** Paginated product list. */
export function useProducts(params = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: ({ signal }) => fetchProducts({ ...params, signal }),
  });
}

export function useProduct(id) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: ({ signal }) => fetchProduct(id, { signal }),
    enabled: id != null && id !== "",
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: ({ signal }) => fetchCategories({ signal }),
    staleTime: 60 * 60 * 1000, // categories rarely change
  });
}

/**
 * Fetch several products by id in parallel. Results share the same cache keys as useProduct,
 * so a product opened on its detail page is not fetched again for the cart or wishlist.
 */
export function useProductsByIds(ids) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.products.detail(id),
      queryFn: ({ signal }) => fetchProduct(id, { signal }),
      staleTime: 60 * 1000,
    })),
  });
}
