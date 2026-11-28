"use client";

import Link from "next/link";
import demoUsers from "@/data/demo-users.json";
import seed from "@/data/analytics.json";
import { useAdminCatalogue } from "@/hooks/use-admin-data";
import { useOrdersStore, useRecAnalyticsStore, useUsersStore } from "@/store";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { formatDateTime, formatPrice } from "@/lib/formatters";
import { statusLabel } from "@/features/orders/order-lifecycle";
import { Skeleton } from "@/components/feedback/skeleton";
import { computeOverview, customersFrom, lowStock, mergeStats, recentActivity, summarizeAnalytics, topProducts } from "./admin-metrics";
import { Panel, PageHeader, SimulatedBadge, StatCard } from "./admin-ui";

const pct = (n) => `${(n * 100).toFixed(1)}%`;

export function OverviewView() {
  const { products, isPending, isError, refetch } = useAdminCatalogue();
  const orders = useOrdersStore((s) => s.orders);
  const registered = useUsersStore((s) => s.users);
  const stats = useRecAnalyticsStore((s) => s.stats);

  const customerCount = customersFrom(demoUsers, registered).length;
  const overview = computeOverview({ products, orders, customerCount, seedVisitors: seed.seedVisitors });
  const rec = summarizeAnalytics(mergeStats(stats, seed.seedStrategyStats, true));
  const low = lowStock(products, LOW_STOCK_THRESHOLD);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard overview" subtitle="A snapshot of the demo store." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total products" value={isPending ? "…" : overview.totalProducts} hint={overview.archivedProducts ? `${overview.archivedProducts} archived` : undefined} />
        <StatCard label="Total orders" value={overview.totalOrders} />
        <StatCard label="Total customers" value={overview.totalCustomers} />
        <StatCard label="Revenue" value={formatPrice(overview.revenue)} hint="From demo orders" simulated />
        <StatCard label="Conversion rate" value={pct(overview.conversionRate)} hint={`Orders ÷ ${seed.seedVisitors.toLocaleString("en-IN")} simulated visitors`} simulated />
        <StatCard label="Recommendation CTR" value={pct(rec.ctr)} hint={`${rec.total.clicks} clicks / ${rec.total.impressions} impressions`} />
      </div>

      {isError && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          Couldn&apos;t load the catalogue, so product figures are missing.{" "}
          <button type="button" onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top-performing products">
          {topProducts(orders).length === 0 ? (
            <p className="text-sm text-ink-soft">No orders yet.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {topProducts(orders).map((t) => (
                <li key={t.productId} className="flex justify-between gap-3">
                  <Link href={`/products/${t.productId}`} className="min-w-0 truncate hover:underline">
                    {t.title}
                  </Link>
                  <span className="shrink-0 text-ink-soft">
                    {t.units} sold · {formatPrice(t.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Low-stock alerts">
          {isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : low.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing is running low.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {low.slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <Link href={`/admin/products/${p.id}`} className="min-w-0 truncate hover:underline">
                    {p.title}
                  </Link>
                  <span className={p.stock === 0 ? "font-medium text-danger" : "text-amber-700"}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
          {low.length > 8 && <p className="mt-2 text-xs text-ink-soft">and {low.length - 8} more. Filter by stock in Products.</p>}
        </Panel>

        <Panel title="Recent activity">
          <ul className="space-y-2 text-sm">
            {recentActivity(orders).map((e) => (
              <li key={`${e.orderId}-${e.status}`} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <Link href={`/admin/orders/${e.orderId}`} className="font-medium hover:underline">
                    {e.orderId}
                  </Link>{" "}
                  <span className="text-ink-soft">{e.status === "placed" ? "placed by" : `${statusLabel(e.status).toLowerCase()} ·`} {e.customer}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-soft">{formatDateTime(e.at)}</span>
              </li>
            ))}
            {orders.length === 0 && <li className="text-ink-soft">No activity yet.</li>}
          </ul>
        </Panel>

        <Panel title="Recommendations at a glance">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            Local analytics <SimulatedBadge>Includes demo seed data</SimulatedBadge>
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-ink-soft">Impressions</dt>
              <dd className="text-lg font-semibold">{rec.total.impressions}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Clicks</dt>
              <dd className="text-lg font-semibold">{rec.total.clicks}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Add to cart</dt>
              <dd className="text-lg font-semibold">{rec.total.addToCarts}</dd>
            </div>
          </dl>
          <Link href="/admin/analytics" className="mt-3 inline-block text-sm font-medium text-brand-600 underline">
            See strategy performance
          </Link>
        </Panel>
      </div>
    </div>
  );
}
