"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProductsByIds } from "@/hooks/use-products";
import { useCartStore } from "@/store";
import { reconcileLine } from "./cart-reconcile";

/**
 * Validate every cart line against fresh API data (TanStack Query) while keeping the
 * persisted snapshot as the fallback. Handles: out of stock, quantity above stock (auto-clamped
 * with an explanation), price changes (need confirmation), disappeared products and API failures.
 */
export function useCartSync() {
  const items = useCartStore((s) => s.items);
  const applyLiveStock = useCartStore((s) => s.applyLiveStock);
  const productIds = useMemo(() => [...new Set(items.map((i) => i.productId))], [items]);
  const results = useProductsByIds(productIds);
  const [notices, setNotices] = useState({});

  const resultKey = results.map((r) => `${r.status}:${r.dataUpdatedAt}:${r.errorUpdatedAt}`).join("|");

  const lines = useMemo(() => {
    const byId = new Map(productIds.map((id, i) => [id, results[i]]));
    return items.map((item) => {
      const r = byId.get(item.productId);
      const live = { product: r?.data, error: r?.data ? undefined : r?.error, isPending: r?.isPending };
      return { item, live, ...reconcileLine(item, live) };
    });
    // results is intentionally tracked through resultKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, productIds, resultKey]);

  // Sync live stock into the store: clamp quantities (shared across variants) and explain why.
  useEffect(() => {
    const done = new Set();
    lines.forEach((l) => {
      const p = l.live.product;
      if (!p || done.has(p.id)) return;
      done.add(p.id);
      const units = lines.filter((x) => x.item.productId === p.id).reduce((n, x) => n + x.item.quantity, 0);
      const overStock = p.stock > 0 && units > p.stock;
      if (overStock) {
        setNotices((n) => {
          const next = { ...n };
          lines.filter((x) => x.item.productId === p.id).forEach((x) => {
            next[x.item.lineId] = `Only ${p.stock} in stock, so we adjusted the quantity.`;
          });
          return next;
        });
      }
      if (overStock || l.item.snapshot.stock !== p.stock) applyLiveStock(p.id, p.stock);
    });
  }, [lines, applyLiveStock]);

  const retry = useCallback(() => results.forEach((r) => r.isError && r.refetch()), [results]);
  const dismissNotice = useCallback((lineId) => setNotices(({ [lineId]: _drop, ...rest }) => rest), []);

  return {
    lines,
    notices,
    dismissNotice,
    retry,
    hasStale: lines.some((l) => l.status === "stale"),
    isChecking: lines.some((l) => l.status === "checking"),
  };
}
