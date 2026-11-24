"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseCatalogueParams, serializeCatalogueParams } from "./catalogue-params";

/** Catalogue state lives in the URL, so back/forward and shared links just work. */
export function useCatalogueParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const params = useMemo(() => parseCatalogueParams(searchParams), [searchParams]);

  const update = useCallback(
    (patch) => {
      const next = { ...params, ...patch };
      if (!("page" in patch)) next.page = 1; // any filter/sort change returns to page 1
      router.replace(`${pathname}${serializeCatalogueParams(next)}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const clearFilters = useCallback(
    () =>
      update({ categories: [], brands: [], minPrice: null, maxPrice: null, minRating: null, stock: "all", onSale: false }),
    [update],
  );

  return { params, update, clearFilters };
}
