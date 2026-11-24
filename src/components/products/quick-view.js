"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star, X } from "lucide-react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { formatCategory, formatPrice, truncate } from "@/lib/formatters";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

/**
 * Quick View modal (accessible dialog: focus trap, Escape, focus restore, mobile friendly).
 * Products with options send the shopper to the full page, where options can be chosen.
 */
export function QuickView({ product, hasOptions, canAdd, atLimit, onAdd, onClose }) {
  const ref = useRef(null);
  useDialogA11y({ open: true, onClose, containerRef: ref });
  const stockText = !product.inStock ? "Out of stock" : product.stock <= LOW_STOCK_THRESHOLD ? `Only ${product.stock} left` : "In stock";

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="qv-title" className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-canvas p-5 shadow-pop sm:max-w-2xl sm:rounded-2xl">
        <button type="button" onClick={onClose} aria-label="Close quick view" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full hover:bg-surface-muted">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted">
            {product.thumbnail && <Image src={product.thumbnail} alt={product.title} fill sizes="(min-width: 640px) 300px, 90vw" className="object-contain" />}
          </div>
          <div>
            <p className="text-xs text-ink-soft">{formatCategory(product.category)}</p>
            <h2 id="qv-title" className="mt-1 pr-8 text-lg font-semibold">{product.title}</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              {product.rating.toFixed(1)}<span className="sr-only"> out of 5</span>
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{formatPrice(product.price)}</span>
              {product.discountPercentage > 0 && <span className="text-sm text-ink-soft line-through">{formatPrice(product.originalPrice)}</span>}
            </div>
            <p className={`mt-1 text-sm font-medium ${product.inStock ? "text-success" : "text-danger"}`}>{stockText}</p>
            <p className="mt-3 text-sm text-ink-soft">{truncate(product.description, 160)}</p>
            <div className="mt-5 flex flex-col gap-2">
              {hasOptions ? (
                <Link href={`/products/${product.id}`} className="rounded-md bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-700">
                  Choose options
                </Link>
              ) : (
                <button type="button" onClick={onAdd} disabled={!canAdd} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft">
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  {!product.inStock ? "Out of stock" : atLimit ? "Max in cart" : "Add to cart"}
                </button>
              )}
              <Link href={`/products/${product.id}`} className="rounded-md border border-line px-4 py-2.5 text-center text-sm font-medium hover:bg-surface-muted">
                View full details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
