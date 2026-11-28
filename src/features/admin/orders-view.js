"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useOrdersStore } from "@/store";
import { formatDateTime, formatPrice } from "@/lib/formatters";
import { ORDER_STATUSES, nextStatus, statusLabel } from "@/features/orders/order-lifecycle";
import { StatusBadge } from "@/features/orders/status-badge";
import { filterOrders } from "./admin-metrics";
import { PageHeader, btnGhost, inputCls } from "./admin-ui";

const EMPTY = { query: "", status: "all", customer: "all", from: "", to: "" };

/** All orders with search, status, customer and date filters, and stage-by-stage status updates. */
export function AdminOrdersView() {
  const orders = useOrdersStore((s) => s.orders);
  const advance = useOrdersStore((s) => s.advance);
  const [filters, setFilters] = useState(EMPTY);
  const [notice, setNotice] = useState("");

  const customers = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => map.set(o.userId, o.customer.name));
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);
  const rows = useMemo(() => [...filterOrders(orders, filters)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [orders, filters]);
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY);
  const dateError = filters.from && filters.to && filters.from > filters.to ? "The start date is after the end date." : "";

  return (
    <div className="space-y-4">
      <PageHeader title="Orders" subtitle="Update an order's stage as it moves through fulfilment. Tracking is simulated." />

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-ink-soft">Search</span>
          <input type="search" value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="Order ID, name or email" className={`${inputCls} w-56`} />
        </label>
        <label className="text-sm">
          <span className="block text-ink-soft">Status</span>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-ink-soft">Customer</span>
          <select value={filters.customer} onChange={(e) => set({ customer: e.target.value })} className={inputCls}>
            <option value="all">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-ink-soft">From</span>
          <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="block text-ink-soft">To</span>
          <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className={inputCls} />
        </label>
        {filtered && (
          <button type="button" onClick={() => setFilters(EMPTY)} className={btnGhost}>
            Clear filters
          </button>
        )}
      </div>
      {dateError && (
        <p role="alert" className="text-sm text-danger">
          {dateError}
        </p>
      )}
      <p role="status" className="min-h-5 text-sm text-success">
        {notice}
      </p>

      {orders.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center text-sm text-ink-soft">No orders have been placed yet.</p>
      ) : rows.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center text-sm text-ink-soft">No orders match these filters.</p>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            {rows.length} {rows.length === 1 ? "order" : "orders"}
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <caption className="sr-only">Orders</caption>
              <thead className="border-b border-line text-xs text-ink-soft">
                <tr>
                  {["Order", "Placed", "Customer", "Status", "Total", "Update"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const next = nextStatus(o.status);
                  return (
                    <tr key={o.id} className="border-t border-line">
                      <td className="px-3 py-3">
                        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                          {o.id}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{formatDateTime(o.createdAt)}</td>
                      <td className="px-3 py-3">
                        {o.customer.name}
                        <span className="block text-xs text-ink-soft">{o.customer.email}</span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-3 py-3">{formatPrice(o.pricing.total)}</td>
                      <td className="px-3 py-3">
                        {next ? (
                          <button type="button" onClick={() => { advance(o.id); setNotice(`${o.id} is now ${statusLabel(next)}. Changes saved locally in this demo.`); }} aria-label={`Advance ${o.id} to ${statusLabel(next)}`} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface-muted">
                            Advance to {statusLabel(next)}
                          </button>
                        ) : (
                          <span className="text-xs text-ink-soft">Complete</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
