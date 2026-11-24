"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Eye, Heart, Scale, ShoppingCart, Star } from "lucide-react";
import { formatPrice, formatCategory } from "@/lib/formatters";
import { selectProductQuantity, useCartStore, useCompareStore, useWishlistStore } from "@/store";
import { MAX_COMPARE } from "@/store/compare-store";
import { getVariantConfig } from "@/features/products/variants";
import { QuickView } from "./quick-view";
import { cn } from "@/lib/utils";

const iconBtn = "grid h-9 w-9 place-items-center rounded-full bg-surface/90 shadow-card hover:bg-surface";

/**
 * Product card: wishlist, Quick View, compare and add-to-cart.
 * @param {{product: import("@/services/api/normalize-product").Product, priority?: boolean}} props
 */
export function ProductCard({ product, priority = false }) {
  const wishlisted = useWishlistStore((s) => s.ids.includes(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const inCart = useCartStore(selectProductQuantity(product.id));
  const addItem = useCartStore((s) => s.addItem);
  const comparing = useCompareStore((s) => s.ids.includes(product.id));
  const addCompare = useCompareStore((s) => s.add);
  const removeCompare = useCompareStore((s) => s.remove);
  const [justAdded, setJustAdded] = useState(false);
  const [quickView, setQuickView] = useState(false);
  const [compareNote, setCompareNote] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const hasOptions = useMemo(() => Boolean(getVariantConfig(product)), [product]);
  const atLimit = product.inStock && inCart >= product.stock;
  const canAdd = product.inStock && !atLimit;

  function handleAdd() {
    addItem(product, 1);
    setJustAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 1500);
  }

  function toggleCompare() {
    if (comparing) {
      removeCompare(product.id);
      setCompareNote("");
    } else if (!addCompare(product.id)) {
      setCompareNote(`You can compare up to ${MAX_COMPARE} products. Remove one first.`);
    } else setCompareNote("");
  }

  const cartLabel = !product.inStock ? "Out of stock" : atLimit ? "Max in cart" : justAdded ? "Added" : "Add to cart";

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
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <button type="button" onClick={() => toggleWishlist(product.id)} aria-pressed={wishlisted} aria-label={wishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`} className={iconBtn}>
            <Heart className={cn("h-5 w-5", wishlisted ? "fill-danger text-danger" : "text-ink-soft")} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setQuickView(true)} aria-label={`Quick view ${product.title}`} className={iconBtn}>
            <Eye className="h-5 w-5 text-ink-soft" aria-hidden="true" />
          </button>
        </div>
      </div>
      <Link href={`/products/${product.id}`} className="mt-3 block">
        <p className="text-xs text-ink-soft">{formatCategory(product.category)}</p>
        {product.brand && <p className="text-xs text-ink-soft">{product.brand}</p>}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium">{product.title}</h3>
      </Link>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-semibold">{formatPrice(product.price)}</span>
        {product.discountPercentage > 0 && <span className="text-xs text-ink-soft line-through">{formatPrice(product.originalPrice)}</span>}
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
        <span>{product.rating.toFixed(1)}</span>
        <span className="sr-only">out of 5</span>
        <span aria-hidden="true">·</span>
        <span className={product.inStock ? "" : "text-danger"}>{product.inStock ? "In stock" : "Out of stock"}</span>
      </p>

      {hasOptions && product.inStock ? (
        <Link href={`/products/${product.id}`} className="mt-3 flex w-full items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Choose options
        </Link>
      ) : (
        <button type="button" onClick={handleAdd} disabled={!canAdd} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft">
          {justAdded ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
          {cartLabel}
        </button>
      )}

      <button type="button" onClick={toggleCompare} aria-pressed={comparing} aria-label={comparing ? `Added to compare: ${product.title}` : `Compare ${product.title}`} className={cn("mt-2 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium hover:bg-surface-muted", comparing ? "text-brand-700" : "text-ink-soft")}>
        <Scale className="h-3.5 w-3.5" aria-hidden="true" />
        {comparing ? "Added to compare" : "Compare"}
      </button>
      <span role="status" className="sr-only">
        {justAdded ? `${product.title} added to cart` : ""}
        {compareNote}
      </span>
      {compareNote && <p className="text-center text-xs text-danger">{compareNote}</p>}

      {quickView && (
        <QuickView
          product={product}
          hasOptions={hasOptions}
          canAdd={canAdd}
          atLimit={atLimit}
          onAdd={handleAdd}
          onClose={() => setQuickView(false)}
        />
      )}
    </article>
  );
}
