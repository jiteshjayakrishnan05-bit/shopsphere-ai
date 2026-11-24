"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, WifiOff } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/store";
import { Skeleton } from "@/components/feedback/skeleton";
import { CartLine } from "./cart-line";
import { OrderSummary } from "./order-summary";
import { useCartSync } from "./use-cart-sync";
import { evaluateCoupon } from "./coupons";
import { calculateTotals } from "./pricing";
import { canCheckout as checkCanCheckout, isPayable } from "./cart-reconcile";
import { useHydrated } from "@/hooks/use-hydrated";

export function CartView() {
  const hydrated = useHydrated();
  const { isAuthenticated } = useAuth();
  const { lines, notices, dismissNotice, retry, hasStale, isChecking } = useCartSync();
  const saved = useCartStore((s) => s.savedForLater);
  const couponCode = useCartStore((s) => s.couponCode);
  const { setQuantity, removeItem, saveForLater, moveToCart, removeSaved, acceptPrice, setCoupon, clearCoupon } = useCartStore.getState();

  const payable = useMemo(() => lines.filter(isPayable).map((l) => ({ unitPrice: l.unitPrice, quantity: l.item.quantity })), [lines]);
  const subtotal = useMemo(() => calculateTotals(payable).subtotal, [payable]);
  const couponEval = couponCode ? evaluateCoupon(couponCode, subtotal) : null;
  const activeCoupon = couponEval?.status === "valid" ? couponEval.coupon : null;
  const couponMessage = couponEval && couponEval.status !== "valid" ? `${couponCode} no longer applies: ${couponEval.message}` : null;
  const totals = useMemo(() => calculateTotals(payable, activeCoupon), [payable, activeCoupon]);
  const canCheckout = checkCanCheckout(lines);

  function applyCoupon(code) {
    const result = evaluateCoupon(code, subtotal);
    if (result.status === "valid") setCoupon(result.coupon.code);
    return result;
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-32 w-full" />
      </div>
    );
  }

  const blockedReason = isChecking
    ? "Checking the latest prices and stock…"
    : lines.length === 0
      ? "Add something to your cart first."
      : "Resolve the items marked above to continue.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>

      {hasStale && (
        <div role="status" className="mt-4 flex items-center gap-2 rounded-md border border-line bg-surface-muted px-3 py-2 text-sm">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          We couldn&apos;t reach the store to refresh your items, so we&apos;re showing what we last knew.
          <button type="button" onClick={retry} className="ml-auto font-medium text-brand-600 underline">
            Retry
          </button>
        </div>
      )}

      {lines.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-ink-soft" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Your cart is empty</h2>
          <p className="mt-1 text-sm text-ink-soft">Browse the catalogue and add something you like.</p>
          <Link href="/products" className="mt-5 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <ul aria-label="Cart items" className="space-y-4">
            {lines.map((line) => (
              <CartLine
                key={line.item.lineId}
                line={line}
                notice={notices[line.item.lineId]}
                onDismissNotice={dismissNotice}
                onQuantity={setQuantity}
                onRemove={removeItem}
                onSave={saveForLater}
                onAcceptPrice={acceptPrice}
              />
            ))}
          </ul>
          <OrderSummary
            totals={totals}
            coupon={activeCoupon}
            couponMessage={couponMessage}
            onApplyCoupon={applyCoupon}
            onRemoveCoupon={clearCoupon}
            canCheckout={canCheckout}
            blockedReason={blockedReason}
            checkoutHref={isAuthenticated ? "/checkout" : "/login?next=%2Fcheckout"}
          />
        </div>
      )}

      {saved.length > 0 && (
        <section aria-labelledby="saved-heading" className="mt-10">
          <h2 id="saved-heading" className="text-lg font-semibold">
            Saved for later ({saved.length})
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {saved.map((item) => (
              <li key={item.lineId} className="flex gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                  {item.snapshot.thumbnail && <Image src={item.snapshot.thumbnail} alt="" fill sizes="64px" className="object-contain" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.productId}`} className="line-clamp-1 text-sm font-medium hover:underline">
                    {item.snapshot.title}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {formatPrice(item.snapshot.price)}
                    {item.variant && ` · ${item.variant}`}
                  </p>
                  <div className="mt-2 flex gap-3 text-sm">
                    <button type="button" onClick={() => moveToCart(item.lineId)} aria-label={item.snapshot.stock <= 0 ? undefined : `Move ${item.snapshot.title} to cart`} disabled={item.snapshot.stock <= 0} className="font-medium text-brand-600 hover:underline disabled:text-ink-soft disabled:no-underline">
                      {item.snapshot.stock <= 0 ? "Out of stock" : "Move to cart"}
                    </button>
                    <button type="button" onClick={() => removeSaved(item.lineId)} aria-label={`Remove ${item.snapshot.title} from saved items`} className="text-danger hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
