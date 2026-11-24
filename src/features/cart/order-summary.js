"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag, X } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { FREE_SHIPPING_THRESHOLD, TAX_RATE } from "@/lib/constants";

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${strong ? "border-t border-line pt-3 text-base font-semibold" : ""} ${tone === "good" ? "text-success" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Totals, coupon entry and the checkout call to action.
 * `coupon` is the currently applied (already validated) coupon or null.
 */
export function OrderSummary({ totals, coupon, couponMessage, onApplyCoupon, onRemoveCoupon, canCheckout, blockedReason, checkoutHref }) {
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState(null);

  function submit(e) {
    e.preventDefault();
    const result = onApplyCoupon(code);
    setFeedback(result.status === "valid" ? { ok: true, text: `${result.coupon.code} applied: ${result.coupon.description}.` } : { ok: false, text: result.message });
    if (result.status === "valid") setCode("");
  }

  return (
    <section aria-labelledby="summary-heading" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 lg:sticky lg:top-24">
      <h2 id="summary-heading" className="text-lg font-semibold">
        Order summary
      </h2>

      <form onSubmit={submit} className="mt-4" noValidate>
        <label htmlFor="coupon-code" className="text-sm font-medium">
          Coupon code
        </label>
        <div className="mt-1 flex gap-2">
          <input id="coupon-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" placeholder="e.g. WELCOME10" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm uppercase placeholder:normal-case" />
          <button type="submit" className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-surface-muted">
            Apply
          </button>
        </div>
        <p role="status" className={`mt-1 min-h-5 text-xs ${feedback?.ok ? "text-success" : "text-danger"}`}>
          {feedback?.text}
        </p>
      </form>

      {coupon && (
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {coupon.code}
          <button type="button" onClick={onRemoveCoupon} aria-label={`Remove coupon ${coupon.code}`}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </p>
      )}
      {couponMessage && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {couponMessage}
        </p>
      )}

      <dl className="mt-2">
        <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
        {totals.discount > 0 && <Row label="Discount" value={`− ${formatPrice(totals.discount)}`} tone="good" />}
        <Row label="Shipping" value={totals.shipping === 0 ? (totals.subtotal === 0 ? "—" : "Free") : formatPrice(totals.shipping)} />
        <Row label={`Tax (${Math.round(TAX_RATE * 100)}%, simulated)`} value={formatPrice(totals.tax)} />
        <Row label="Total" value={formatPrice(totals.total)} strong />
      </dl>
      <p className="mt-2 text-xs text-ink-soft">Free shipping on orders of {formatPrice(FREE_SHIPPING_THRESHOLD)} or more after discounts.</p>

      {canCheckout ? (
        <Link href={checkoutHref} className="mt-4 block rounded-md bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-700">
          Proceed to checkout
        </Link>
      ) : (
        <>
          <button type="button" disabled className="mt-4 w-full rounded-md bg-surface-muted px-4 py-3 text-sm font-medium text-ink-soft">
            Proceed to checkout
          </button>
          {blockedReason && <p className="mt-2 text-xs text-ink-soft">{blockedReason}</p>}
        </>
      )}
    </section>
  );
}
