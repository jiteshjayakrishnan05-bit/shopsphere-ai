import { summarizeAnalytics } from "@/store/recommendation-analytics-store";

/** Pure calculations behind the administrator dashboard. */

export const referencedProductIds = (orders) => new Set(orders.flatMap((o) => o.items.map((i) => i.productId)));

/** Add the demo seed numbers to locally recorded stats (or leave them out). */
export function mergeStats(local, seed, includeSeed) {
  if (!includeSeed) return local;
  const out = {};
  for (const key of new Set([...Object.keys(local), ...Object.keys(seed)])) {
    const a = local[key] ?? {};
    const b = seed[key] ?? {};
    out[key] = { impressions: (a.impressions ?? 0) + (b.impressions ?? 0), clicks: (a.clicks ?? 0) + (b.clicks ?? 0), addToCarts: (a.addToCarts ?? 0) + (b.addToCarts ?? 0) };
  }
  return out;
}

export function customersFrom(demoUsers, registeredUsers) {
  return [...demoUsers, ...registeredUsers].filter((u) => u.role === "customer").map((u) => ({ id: String(u.id), name: u.name, email: u.email }));
}

/** Headline numbers. Revenue and conversion are SIMULATED (demo orders plus a seeded visitor count). */
export function computeOverview({ products, orders, customerCount, seedVisitors }) {
  const active = products.filter((p) => !p.archived);
  const revenue = orders.reduce((sum, o) => sum + o.pricing.total, 0);
  return {
    totalProducts: active.length,
    archivedProducts: products.length - active.length,
    totalOrders: orders.length,
    totalCustomers: customerCount,
    revenue,
    conversionRate: seedVisitors > 0 ? orders.length / seedVisitors : 0,
  };
}

/** Best sellers by units, then revenue, then id. */
export function topProducts(orders, limit = 5) {
  const map = new Map();
  for (const o of orders) {
    for (const i of o.items) {
      const row = map.get(i.productId) ?? { productId: i.productId, title: i.title, units: 0, revenue: 0 };
      row.units += i.quantity;
      row.revenue += i.price * i.quantity;
      map.set(i.productId, row);
    }
  }
  return [...map.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue || a.productId - b.productId).slice(0, limit);
}

/** Active products that are out of stock or running low, lowest stock first. */
export function lowStock(products, threshold) {
  return products.filter((p) => !p.archived && p.stock <= threshold).sort((a, b) => a.stock - b.stock || a.id - b.id);
}

/** Latest order events (placed and every status change), newest first. */
export function recentActivity(orders, limit = 8) {
  const events = [];
  for (const o of orders) for (const t of o.timeline) events.push({ orderId: o.id, status: t.status, at: t.at, customer: o.customer.name });
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.orderId.localeCompare(b.orderId)).slice(0, limit);
}

/** Order search and filters. `from` and `to` are YYYY-MM-DD, inclusive, in local time. */
export function filterOrders(orders, { query = "", status = "all", customer = "all", from = "", to = "" } = {}) {
  const q = query.trim().toLowerCase();
  const start = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const end = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
  return orders.filter((o) => {
    if (q && !`${o.id} ${o.customer.name} ${o.customer.email}`.toLowerCase().includes(q)) return false;
    if (status !== "all" && o.status !== status) return false;
    if (customer !== "all" && o.userId !== customer) return false;
    const created = Date.parse(o.createdAt);
    if (start !== null && created < start) return false;
    if (end !== null && created > end) return false;
    return true;
  });
}

/** Product table filters: stock is all, in, low (1..threshold) or out; status is active, archived or all. */
export function filterAdminProducts(products, { query = "", category = "all", stock = "all", status = "active" } = {}, lowThreshold = 5) {
  const q = query.trim().toLowerCase();
  return products.filter((p) => {
    if (q && !`${p.title} ${p.brand ?? ""} ${p.id} ${p.sku ?? ""}`.toLowerCase().includes(q)) return false;
    if (category !== "all" && p.category !== category) return false;
    if (stock === "in" && p.stock <= 0) return false;
    if (stock === "out" && p.stock > 0) return false;
    if (stock === "low" && !(p.stock > 0 && p.stock <= lowThreshold)) return false;
    if (status === "active" && p.archived) return false;
    if (status === "archived" && !p.archived) return false;
    return true;
  });
}

export { summarizeAnalytics };
