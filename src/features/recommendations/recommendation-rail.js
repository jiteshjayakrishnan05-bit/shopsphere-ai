"use client";

import { ProductCard } from "@/components/products/product-card";
import { ProductCardSkeleton, Skeleton } from "@/components/feedback/skeleton";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useRecAnalyticsStore } from "@/store";
import { useImpressionOnce } from "./use-rail-tracking";

/**
 * One recommendation rail. It always says why it is shown (title, subtitle and a reason on each card),
 * hides itself when there is nothing useful to show, and never breaks the page if recommendations fail.
 * @param {{strategy: string, seed?: object|null, category?: string|null, limit?: number, title?: string, className?: string}} props
 */
export function RecommendationRail({ strategy, seed = null, category = null, limit = 4, title, className = "mt-12" }) {
  const { result, isLoading, failed } = useRecommendations(strategy, { seed, category, limit });
  const recordClick = useRecAnalyticsStore((s) => s.recordClick);
  const recordAdd = useRecAnalyticsStore((s) => s.recordAddToCart);
  const hasItems = Boolean(result?.items?.length);
  const ref = useImpressionOnce(strategy, hasItems && !isLoading);

  if (isLoading) {
    return (
      <section className={className} aria-busy="true" aria-label="Loading recommendations">
        <Skeleton className="h-6 w-56" />
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: Math.min(limit, 4) }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }
  if (failed || !hasItems) return null; // optional content: absence is better than an error box

  function track(e) {
    if (e.target.closest('[data-action="add-to-cart"]:not([disabled])')) recordAdd(strategy);
    else if (e.target.closest("a[href]")) recordClick(strategy);
  }

  const headingId = `rail-${strategy}-${seed?.id ?? category ?? "x"}`;
  return (
    <section ref={ref} className={className} aria-labelledby={headingId} data-strategy={strategy}>
      <h2 id={headingId} className="text-lg font-semibold">
        {title ?? result.title}
      </h2>
      {result.subtitle && <p className="mt-0.5 text-sm text-ink-soft">{result.subtitle}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4" onClickCapture={track}>
        {result.items.map(({ product, reason }) => (
          <ProductCard key={product.id} product={product} reason={reason} />
        ))}
      </div>
    </section>
  );
}
