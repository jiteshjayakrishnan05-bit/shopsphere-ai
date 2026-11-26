"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { selectProductQuantity, useCartStore } from "@/store";
import { getVariantConfig } from "@/features/products/variants";

/** Compact product card for chat. The number lets the shopper say "more like the second one". */
export function AssistantProductCard({ product, index, onNavigate }) {
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore(selectProductQuantity(product.id));
  const hasOptions = Boolean(getVariantConfig(product));
  const atLimit = product.inStock && inCart >= product.stock;

  return (
    <li className="flex gap-3 rounded-lg border border-line bg-surface p-2">
      <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-medium text-white">
        <span className="sr-only">Result </span>
        {index}
      </span>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-muted">
        {product.thumbnail && <Image src={product.thumbnail} alt="" fill sizes="56px" className="object-contain" />}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${product.id}`} onClick={onNavigate} className="line-clamp-2 text-sm font-medium hover:underline">
          {product.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
          <span className="font-semibold text-ink">{formatPrice(product.price)}</span>
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            {product.rating.toFixed(1)}
            <span className="sr-only"> out of 5</span>
          </span>
          <span className={product.inStock ? "" : "text-danger"}>{product.inStock ? "In stock" : "Out of stock"}</span>
        </p>
        {hasOptions && product.inStock ? (
          <Link href={`/products/${product.id}`} onClick={onNavigate} className="mt-1 inline-block text-xs font-medium text-brand-600 underline">
            Choose options
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => addItem(product, 1)}
            disabled={!product.inStock || atLimit}
            aria-label={`Add ${product.title} to cart`}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline disabled:text-ink-soft disabled:no-underline"
          >
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
            {!product.inStock ? "Out of stock" : atLimit ? "Max in cart" : "Add to cart"}
          </button>
        )}
      </div>
    </li>
  );
}
