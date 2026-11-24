"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Heart, ShoppingCart, Star } from "lucide-react";
import { formatPrice, formatCategory } from "@/lib/formatters";
import { useCartStore, useWishlistStore } from "@/store";
import { cn } from "@/lib/utils";

/**
 * Product card with working wishlist and add-to-cart. Quick View and Compare arrive in Phase 3b.
 * @param {{product: import("@/services/api/normalize-product").Product, priority?: boolean}} props
 */
export function ProductCard({ product, priority = false }) {
  const wishlisted = useWishlistStore((s) => s.ids.includes(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const atLimit = product.inStock && inCart >= product.stock;
  const canAdd = product.inStock && !atLimit;

  function handleAdd() {
    addItem(product, 1);
    setJustAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <article className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-card">
      <div className="relative">
        <Link href={`/products/${product.id}`} className="block" aria-label={product.title}>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted">
            {product.thumbnail && (
              <Image
                src={product.thumbnail}
                alt=""
                fill
                sizes="(min-width: 1536px) 18vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-contain"
                priority={priority}
              />
            )}
            {product.discountPercentage > 0 && (
              <span className="absolute left-2 top-2 rounded bg-brand-600 px-1.5 py-0.5 text-xs font-medium text-white">
                {product.discountPercentage}% off
              </span>
            )}
          </div>
        </Link>
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-surface/90 shadow-card hover:bg-surface"
        >
          <Heart className={cn("h-5 w-5", wishlisted ? "fill-danger text-danger" : "text-ink-soft")} aria-hidden="true" />
        </button>
      </div>
      <Link href={`/products/${product.id}`} className="mt-3 block">
        <p className="text-xs text-ink-soft">{formatCategory(product.category)}</p>
        {product.brand && <p className="text-xs text-ink-soft">{product.brand}</p>}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium">{product.title}</h3>
      </Link>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-semibold">{formatPrice(product.price)}</span>
        {product.discountPercentage > 0 && (
          <span className="text-xs text-ink-soft line-through">{formatPrice(product.originalPrice)}</span>
        )}
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
        <span>{product.rating.toFixed(1)}</span>
        <span className="sr-only">out of 5</span>
        <span aria-hidden="true">·</span>
        <span className={product.inStock ? "" : "text-danger"}>{product.inStock ? "In stock" : "Out of stock"}</span>
      </p>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft"
      >
        {justAdded ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
        {!product.inStock ? "Out of stock" : atLimit ? "Max in cart" : justAdded ? "Added" : "Add to cart"}
      </button>
      <span role="status" className="sr-only">
        {justAdded ? `${product.title} added to cart` : ""}
      </span>
    </article>
  );
}
