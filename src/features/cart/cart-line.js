"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Bookmark, Trash2, X } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { QuantitySelector } from "@/components/common/quantity-selector";

/** One cart row with status banners (price change, stock, unavailable) and actions. */
export function CartLine({ line, notice, onDismissNotice, onQuantity, onRemove, onSave, onAcceptPrice }) {
  const { item, status, unitPrice } = line;
  const { snapshot } = item;
  const blocked = status === "unavailable" || status === "out_of_stock";
  const maxQty = Math.max(1, snapshot.stock);

  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex gap-4">
        <Link href={`/products/${item.productId}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
          {snapshot.thumbnail && <Image src={snapshot.thumbnail} alt="" fill sizes="96px" className="object-contain" />}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/products/${item.productId}`} className="line-clamp-2 font-medium hover:underline">
            {snapshot.title}
          </Link>
          {item.variant && <p className="mt-0.5 text-sm text-ink-soft">Option: {item.variant}</p>}
          <p className="mt-1 text-sm">
            {formatPrice(unitPrice)}
            <span className="text-ink-soft"> each</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <QuantitySelector
              value={item.quantity}
              max={maxQty}
              disabled={blocked}
              label={`Quantity for ${snapshot.title}`}
              onChange={(q) => onQuantity(item.lineId, q)}
            />
            {!blocked && item.quantity >= snapshot.stock && snapshot.stock > 0 && (
              <span className="text-xs text-ink-soft">Maximum available</span>
            )}
            <button type="button" onClick={() => onSave(item.lineId)} aria-label={`Save ${snapshot.title} for later`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
              <Bookmark className="h-4 w-4" aria-hidden="true" /> Save for later
            </button>
            <button type="button" onClick={() => onRemove(item.lineId)} aria-label={`Remove ${snapshot.title}`} className="inline-flex items-center gap-1 text-sm text-danger hover:underline">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
            </button>
          </div>
        </div>
        <p className="shrink-0 font-semibold">{blocked ? "—" : formatPrice(unitPrice * item.quantity)}</p>
      </div>

      {status === "unavailable" && (
        <Banner tone="danger">This product is no longer available. Remove it to continue to checkout.</Banner>
      )}
      {status === "out_of_stock" && (
        <Banner tone="danger">Out of stock. We kept it here so you can see what you chose. Remove it or save it for later.</Banner>
      )}
      {status === "price_changed" && (
        <Banner tone="warn">
          <span>
            The price changed from <s>{formatPrice(line.oldPrice)}</s> to <strong>{formatPrice(line.newPrice)}</strong>. Please confirm before checkout.
          </span>
          <button type="button" onClick={() => onAcceptPrice(item.productId, line.newPrice)} className="ml-auto shrink-0 rounded-md bg-ink px-3 py-1 text-xs font-medium text-white">
            Accept new price
          </button>
        </Banner>
      )}
      {status === "stale" && <Banner tone="info">Couldn&apos;t refresh this item. Showing the last known price and stock.</Banner>}
      {notice && (
        <Banner tone="info">
          <span>{notice}</span>
          <button type="button" onClick={() => onDismissNotice(item.lineId)} aria-label="Dismiss message" className="ml-auto shrink-0">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </Banner>
      )}
    </li>
  );
}

function Banner({ tone, children }) {
  const tones = {
    danger: "border-danger/30 bg-danger/5 text-danger",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    info: "border-line bg-surface-muted text-ink-soft",
  };
  return (
    <div role={tone === "info" ? "status" : "alert"} className={`mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>
      {tone !== "info" && <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
    </div>
  );
}
