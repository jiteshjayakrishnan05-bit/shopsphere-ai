"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAllProducts, searchAllProducts, fetchAllProductsByCategory } from "@/services/api/product-api";

/**
 * Fetch the full product set for a catalogue page.
 * @param {{type: "all"} | {type: "category", category: string} | {type: "search", query: string}} source
 */
export function useCatalogueSource(source) {
  const key = source.type === "all" ? "all" : `${source.type}:${source.category ?? source.query}`;
  return useQuery({
    queryKey: queryKeys.products.catalogue(key),
    queryFn: ({ signal }) => {
      if (source.type === "category") return fetchAllProductsByCategory(source.category, { signal });
      if (source.type === "search") return searchAllProducts(source.query, { signal });
      return fetchAllProducts({ signal });
    },
    enabled: source.type !== "search" || source.query.length > 0, // never request an empty search
    select: (data) => data.products,
  });
}
