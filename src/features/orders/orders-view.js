"use client";

import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ordersForUser, useOrdersStore } from "@/store";
import { formatDateTime, formatPrice } from "@/lib/formatters";
import { StatusBadge } from "./status-badge";

export function OrdersView() {
  const { user, isAdmin } = useAuth();
  const allOrders = useOrdersStore((s) => s.orders);
  const orders = [...ordersForUser(allOrders, user)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? "All orders" : "Your orders"}</h1>
      {isAdmin && <p className="mt-1 text-sm text-ink-soft">Administrator view: orders from every customer on this device.</p>}
      {orders.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center">
          <PackageOpen className="mx-auto h-10 w-10 text-ink-soft" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No orders yet</h2>
          <p className="mt-1 text-sm text-ink-soft">When you place an order, you can track it here.</p>
          <Link href="/products" className="mt-5 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3" aria-label="Orders">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:bg-surface-muted">
                <div>
                  <p className="font-medium">{o.id}</p>
                  <p className="text-xs text-ink-soft">
                    {formatDateTime(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} items
                    {isAdmin && ` · ${o.customer.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <span className="font-semibold">{formatPrice(o.pricing.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
