"use client";

import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/products/product-card";
import { ProductCardSkeleton } from "@/components/feedback/skeleton";
import { ErrorState } from "@/components/feedback/error-state";

/** Top-rated products. Demonstrates the TanStack Query -> normalizer -> UI pipeline. */
export function FeaturedProducts() {
  const { data, isPending, isError, error, refetch } = useProducts({
    limit: 8,
    sortBy: "rating",
    order: "desc",
  });

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState title="Couldn't load products" message={error.message} onRetry={refetch} />;
  if (data.products.length === 0) {
    return <p className="text-sm text-ink-soft">No products to show right now.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {data.products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
