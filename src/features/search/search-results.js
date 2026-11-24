"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CatalogueView } from "@/features/products/catalogue-view";
import { useSearchHistoryStore } from "@/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { sanitizeSearchQuery } from "@/lib/validators";
import { truncate } from "@/lib/formatters";

/** /search?q=... — the query comes from the URL, so back/forward and shared links work. */
export function SearchResults() {
  const q = sanitizeSearchQuery(useSearchParams().get("q"));
  const record = useSearchHistoryStore((s) => s.record);
  const hydrated = useHydrated(); // writing before rehydration would overwrite saved history

  // Record only searches that reached the results page (covers links and typed submits).
  useEffect(() => {
    if (hydrated && q) record(q);
  }, [hydrated, q, record]);

  return (
    <CatalogueView
      source={{ type: "search", query: q }}
      title={q ? `Results for “${truncate(q, 60)}”` : "Search"}
    />
  );
}
