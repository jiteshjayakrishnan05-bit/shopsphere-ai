"use client";

import { useMemo } from "react";
import { useCatalogueSource } from "@/hooks/use-catalogue-source";
import { ProductCard } from "@/components/products/product-card";
import { formatCategory } from "@/lib/formatters";

/**
 * Simple "more from this category" rail. The weighted Similar Products strategy replaces this
 * when the recommendation engine is built (Phase 7).
 */
export function RelatedProducts({ product }) {
  const { data, isPending, isError } = useCatalogueSource({ type: "category", category: product.category });
  const related = useMemo(() => (data ?? []).filter((p) => p.id !== product.id).slice(0, 4), [data, product.id]);
  if (isPending || isError || related.length === 0) return null; // optional section: never blocks the page
  return (
    <section aria-labelledby="related-heading" className="mt-12">
      <h2 id="related-heading" className="text-lg font-semibold">
        More in {formatCategory(product.category)}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
