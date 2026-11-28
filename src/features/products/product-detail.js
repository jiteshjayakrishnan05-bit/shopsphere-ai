"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, SearchX, ShoppingCart, Star } from "lucide-react";
import { useProduct } from "@/hooks/use-products";
import { useAuth } from "@/hooks/use-auth";
import { useHydrated } from "@/hooks/use-hydrated";
import { selectProductQuantity, useCartStore, useRecentlyViewedStore, useWishlistStore } from "@/store";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { formatCategory, formatPrice } from "@/lib/formatters";
import { Skeleton } from "@/components/feedback/skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { QuantitySelector } from "@/components/common/quantity-selector";
import { ImageGallery } from "./image-gallery";
import { DeliveryEstimate } from "./delivery-estimate";
import { ProductReviews } from "@/features/reviews/product-reviews";
import { useProductReviews } from "@/features/reviews/use-product-reviews";
import { RecommendationRail } from "@/features/recommendations/recommendation-rail";
import { STRATEGY } from "@/services/recommendation/recommendation-strategies";
import { buildSpecifications } from "./specs";
import { firstAvailableVariant, getVariantConfig } from "./variants";
import { cn } from "@/lib/utils";

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading product">
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductDetail({ id }) {
  const { data: product, isPending, isError, error, refetch } = useProduct(id);
  if (isPending) return <DetailSkeleton />;
  if (isError) {
    if (error.status === 404) {
      return (
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <SearchX className="mx-auto h-10 w-10 text-ink-soft" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-semibold">We couldn&apos;t find that product</h1>
          <p className="mt-1 text-sm text-ink-soft">It may have been removed from the store.</p>
          <Link href="/products" className="mt-5 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Browse products
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <ErrorState title="Couldn't load this product" message={error.message} onRetry={refetch} />
      </div>
    );
  }
  return <ProductDetailContent product={product} />;
}

function ProductDetailContent({ product }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { isAuthenticated } = useAuth();
  const variantConfig = useMemo(() => getVariantConfig(product), [product]);
  const [variant, setVariant] = useState(() => firstAvailableVariant(variantConfig));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore(selectProductQuantity(product.id));
  const wishlisted = useWishlistStore((s) => s.ids.includes(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const recordView = useRecentlyViewedStore((s) => s.record);

  // Record browsing history only after stores are rehydrated (otherwise saved history would be overwritten).
  useEffect(() => {
    if (hydrated) recordView(product.id);
  }, [hydrated, product.id, recordView]);

  const remaining = Math.max(0, product.stock - (hydrated ? inCart : 0));
  const needsVariant = Boolean(variantConfig);
  const variantOk = !needsVariant || Boolean(variant);
  const canAdd = product.inStock && variantOk && remaining > 0;
  const qty = Math.min(quantity, Math.max(1, remaining));
  const specs = useMemo(() => buildSpecifications(product), [product]);
  const { all: allReviews } = useProductReviews(product);

  function add() {
    addItem(product, qty, variant);
    setAdded(true);
    setQuantity(1);
    setTimeout(() => setAdded(false), 2000);
  }
  function buyNow() {
    addItem(product, qty, variant);
    router.push(isAuthenticated ? "/checkout" : "/login?next=%2Fcheckout");
  }

  const stockText = !product.inStock
    ? "Out of stock"
    : product.stock <= LOW_STOCK_THRESHOLD
      ? `Only ${product.stock} left`
      : `In stock (${product.stock} available)`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-soft">
        <ol className="flex flex-wrap gap-1">
          <li><Link href="/" className="hover:underline">Home</Link> /</li>
          <li><Link href={`/categories/${product.category}`} className="hover:underline">{formatCategory(product.category)}</Link> /</li>
          <li aria-current="page" className="text-ink">{product.title}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ImageGallery images={product.images} title={product.title} />

        <div>
          {product.brand && <p className="text-sm text-ink-soft">{product.brand}</p>}
          <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-medium text-ink">{product.rating.toFixed(1)}</span>
            <span className="sr-only">out of 5 stars,</span>
            <span>({allReviews.length} {allReviews.length === 1 ? "review" : "reviews"})</span>
          </p>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatPrice(product.price)}</span>
            {product.discountPercentage > 0 && (
              <>
                <span className="text-ink-soft line-through">{formatPrice(product.originalPrice)}</span>
                <span className="rounded bg-brand-50 px-2 py-0.5 text-sm font-medium text-brand-700">{product.discountPercentage}% off</span>
              </>
            )}
          </div>
          <p className={cn("mt-2 text-sm font-medium", product.inStock ? (product.stock <= LOW_STOCK_THRESHOLD ? "text-amber-700" : "text-success") : "text-danger")}>{stockText}</p>

          {variantConfig && (
            <fieldset className="mt-5">
              <legend className="text-sm font-medium">
                {variantConfig.label}
                {variant && <span className="font-normal text-ink-soft">: {variant}</span>}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {variantConfig.options.map((o) => (
                  <label key={o.value} className={cn("cursor-pointer rounded-md border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600", variant === o.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface", !o.available && "cursor-not-allowed text-ink-soft line-through opacity-50")}>
                    <input type="radio" name="variant" value={o.value} checked={variant === o.value} disabled={!o.available} aria-label={o.available ? o.value : `${o.value} (unavailable)`} onChange={() => setVariant(o.value)} className="sr-only" />
                    {o.value}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-soft">Demo options: variants are sample data, not real inventory.</p>
            </fieldset>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <QuantitySelector value={qty} max={Math.max(1, remaining)} disabled={!canAdd} onChange={setQuantity} />
            {hydrated && inCart > 0 && remaining === 0 && <span className="text-xs text-ink-soft">You have all {product.stock} available in your cart.</span>}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={add} disabled={!canAdd} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {!product.inStock ? "Out of stock" : !variantOk ? "Unavailable" : remaining === 0 ? "Max in cart" : added ? "Added to cart" : "Add to cart"}
            </button>
            <button type="button" onClick={buyNow} disabled={!canAdd} className="rounded-md border border-ink bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-muted disabled:text-ink-soft">
              Buy now
            </button>
            <button type="button" onClick={() => toggleWishlist(product.id)} aria-pressed={wishlisted} className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm font-medium hover:bg-surface-muted">
              <Heart className={cn("h-4 w-4", wishlisted && "fill-danger text-danger")} aria-hidden="true" />
              {wishlisted ? "In wishlist" : "Add to wishlist"}
            </button>
          </div>
          <p role="status" className="sr-only">{added ? `${product.title} added to cart` : ""}</p>

          <div className="mt-6">
            <DeliveryEstimate />
          </div>
        </div>
      </div>

      <section aria-labelledby="desc-heading" className="mt-10">
        <h2 id="desc-heading" className="text-lg font-semibold">Description</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">{product.description}</p>
      </section>

      {specs.length > 0 && (
        <section aria-labelledby="spec-heading" className="mt-10">
          <h2 id="spec-heading" className="text-lg font-semibold">Specifications</h2>
          <dl className="mt-3 max-w-3xl divide-y divide-line rounded-lg border border-line bg-surface">
            {specs.map((s) => (
              <div key={s.label} className="grid grid-cols-[10rem_1fr] gap-4 px-4 py-2.5 text-sm">
                <dt className="text-ink-soft">{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-10 max-w-3xl">
        <ProductReviews product={product} />
      </div>

      <RecommendationRail strategy={STRATEGY.similar} seed={product} />
      <RecommendationRail strategy={STRATEGY.frequentlyBoughtTogether} seed={product} />
      <RecommendationRail strategy={STRATEGY.personalized} />
    </div>
  );
}
