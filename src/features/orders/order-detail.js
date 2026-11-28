"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ordersForUser, useOrdersStore } from "@/store";
import { formatPrice, formatShortDate } from "@/lib/formatters";
import { OrderTimeline } from "./order-timeline";
import { StatusBadge } from "./status-badge";
import { nextStatus, statusLabel } from "./order-lifecycle";
import { PriceBreakdown } from "@/features/checkout/checkout-steps";

export function OrderDetail({ id, backHref = "/orders", backLabel = "← All orders" }) {
  const { user, isAdmin } = useAuth();
  const orders = useOrdersStore((s) => s.orders);
  const advance = useOrdersStore((s) => s.advance);
  // Only orders this user may see are searched, so another customer's order looks identical to a missing one.
  const order = ordersForUser(orders, user).find((o) => o.id === id);

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <SearchX className="mx-auto h-10 w-10 text-ink-soft" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-semibold">We couldn&apos;t find that order</h1>
        <Link href={backHref} className="mt-4 inline-block text-sm font-medium text-brand-600 underline">
          Back to orders
        </Link>
      </div>
    );
  }
  const next = nextStatus(order.status);
  const paid = order.payment.status === "paid";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href={backHref} className="text-sm text-brand-600 underline">
        {backLabel}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Order {order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-ink-soft">Expected delivery by {formatShortDate(order.expectedDelivery)}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section aria-labelledby="items-h" className="rounded-lg border border-line bg-surface">
            <h2 id="items-h" className="border-b border-line p-4 text-base font-semibold">
              Items
            </h2>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={`${i.productId}-${i.variant}`} className="flex justify-between gap-3 p-4 text-sm">
                  <span>
                    <Link href={`/products/${i.productId}`} className="font-medium hover:underline">
                      {i.title}
                    </Link>
                    {i.variant && <span className="text-ink-soft"> ({i.variant})</span>}
                    <span className="block text-ink-soft">
                      {formatPrice(i.price)} × {i.quantity}
                    </span>
                  </span>
                  <span className="font-medium">{formatPrice(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-4">
              <PriceBreakdown totals={order.pricing} />
              {order.couponCode && <p className="mt-1 text-xs text-ink-soft">Coupon used: {order.couponCode}</p>}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section aria-labelledby="addr-h" className="rounded-lg border border-line bg-surface p-4 text-sm">
              <h2 id="addr-h" className="text-base font-semibold">
                Delivery address
              </h2>
              <p className="mt-2 text-ink-soft">
                {order.customer.name}
                <br />
                {order.address.address}, {order.address.city}
                <br />
                {order.address.state} {order.address.pincode}, {order.address.country}
              </p>
              <p className="mt-2 text-ink-soft">{order.delivery.label}</p>
            </section>
            <section aria-labelledby="pay-h" className="rounded-lg border border-line bg-surface p-4 text-sm">
              <h2 id="pay-h" className="text-base font-semibold">
                Payment
              </h2>
              <p className="mt-2 text-ink-soft">
                {order.payment.label}: {paid ? "Paid (simulated test payment)" : "Pay on delivery"}
              </p>
            </section>
          </div>
        </div>

        <aside aria-labelledby="track-h" className="h-fit rounded-lg border border-line bg-surface p-4">
          <h2 id="track-h" className="mb-4 text-base font-semibold">
            Order tracking
          </h2>
          <OrderTimeline order={order} />
          <p className="mt-4 text-xs text-ink-soft">Simulated tracking for this demo. No real courier is involved.</p>
          {isAdmin && (
            <button
              type="button"
              disabled={!next}
              onClick={() => advance(order.id)}
              className="mt-4 w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:bg-surface-muted disabled:text-ink-soft"
            >
              {next ? `Advance to “${statusLabel(next)}” (admin)` : "Order delivered"}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
