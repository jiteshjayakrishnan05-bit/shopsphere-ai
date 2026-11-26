"use client";

import { ProductCard } from "@/components/products/product-card";
import { useProductsByIds } from "@/hooks/use-products";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRecentlyViewedStore } from "@/store";

/** The exact browsing history, most recent first (not a recommendation). Hidden until something has been viewed. */
export function RecentlyViewedRail({ limit = 4, className = "mt-12" }) {
  const hydrated = useHydrated();
  const ids = useRecentlyViewedStore((s) => s.ids);
  const shown = hydrated ? ids.slice(0, limit) : [];
  const results = useProductsByIds(shown);
  const products = results.map((r) => r.data).filter(Boolean); // removed products simply drop out
  if (products.length === 0) return null;
  return (
    <section className={className} aria-labelledby="recently-viewed-heading">
      <h2 id="recently-viewed-heading" className="text-lg font-semibold">
        Recently viewed
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
