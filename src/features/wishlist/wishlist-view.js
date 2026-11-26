"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useProductsByIds } from "@/hooks/use-products";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCartStore, useWishlistStore } from "@/store";
import { getVariantConfig } from "@/features/products/variants";
import { formatCategory, formatPrice } from "@/lib/formatters";
import { Skeleton } from "@/components/feedback/skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { RecommendationRail } from "@/features/recommendations/recommendation-rail";
import { STRATEGY } from "@/services/recommendation/recommendation-strategies";

export function WishlistView() {
  const hydrated = useHydrated();
  const ids = useWishlistStore((s) => s.ids);
  const remove = useWishlistStore((s) => s.remove);
  const addItem = useCartStore((s) => s.addItem);
  const results = useProductsByIds(ids);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your wishlist</h1>
      {ids.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-ink-soft" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Your wishlist is empty</h2>
          <p className="mt-1 text-sm text-ink-soft">Tap the heart on any product to save it here.</p>
          <Link href="/products" className="mt-5 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4" aria-label="Wishlist items">
          {ids.map((id, i) => {
            const r = results[i];
            if (!r || r.isPending) {
              return (
                <li key={id}>
                  <Skeleton className="h-28 w-full" />
                </li>
              );
            }
            if (r.isError && !r.data) {
              const gone = r.error.status === 404;
              return (
                <li key={id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
                  <p className="flex-1 text-sm">{gone ? "This product is no longer available." : r.error.message}</p>
                  {!gone && (
                    <button type="button" onClick={() => r.refetch()} className="text-sm font-medium text-brand-600 underline">
                      Retry
                    </button>
                  )}
                  <button type="button" onClick={() => remove(id)} className="text-sm text-danger hover:underline">
                    Remove
                  </button>
                </li>
              );
            }
            const p = r.data;
            const hasOptions = Boolean(getVariantConfig(p));
            return (
              <li key={id} className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
                <Link href={`/products/${p.id}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  {p.thumbnail && <Image src={p.thumbnail} alt="" fill sizes="96px" className="object-contain" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-soft">{formatCategory(p.category)}</p>
                  <Link href={`/products/${p.id}`} className="line-clamp-2 font-medium hover:underline">
                    {p.title}
                  </Link>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">{formatPrice(p.price)}</span>
                    {p.discountPercentage > 0 && <span className="ml-2 text-xs text-ink-soft line-through">{formatPrice(p.originalPrice)}</span>}
                  </p>
                  <p className={`text-xs ${p.inStock ? "text-success" : "text-danger"}`}>{p.inStock ? "In stock" : "Out of stock"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {hasOptions && p.inStock ? (
                      <Link href={`/products/${p.id}`} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                        Choose options
                      </Link>
                    ) : (
                      <button
                        type="button"
                        aria-label={p.inStock ? `Move ${p.title} to cart` : undefined}
                        disabled={!p.inStock}
                        onClick={() => {
                          addItem(p, 1);
                          remove(p.id);
                        }}
                        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft"
                      >
                        {p.inStock ? "Move to cart" : "Out of stock"}
                      </button>
                    )}
                    <button type="button" onClick={() => remove(p.id)} aria-label={`Remove ${p.title} from wishlist`} className="inline-flex items-center gap-1 text-sm text-danger hover:underline">
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {ids.length > 0 && results.some((r) => r.isError && r.data) && (
        <div className="mt-4">
          <ErrorState title="Some items couldn't be refreshed" message="Showing the last information we have." />
        </div>
      )}
      {ids.length > 0 && <RecommendationRail strategy={STRATEGY.wishlist} />}
    </div>
  );
}
