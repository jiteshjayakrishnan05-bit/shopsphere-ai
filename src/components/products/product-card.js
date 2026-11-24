import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatPrice, formatCategory } from "@/lib/formatters";

/**
 * Minimal ProductCard for Phase 1. Wishlist, Quick View, Add to Cart and compare
 * actions are added in Phase 3/5 when the stores are wired to the catalogue.
 * @param {{product: import("@/services/api/normalize-product").Product, priority?: boolean}} props
 */
export function ProductCard({ product, priority = false }) {
  return (
    <article className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-card">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted">
          {product.thumbnail && (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
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
        <p className="mt-3 text-xs text-ink-soft">{formatCategory(product.category)}</p>
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
    </article>
  );
}
