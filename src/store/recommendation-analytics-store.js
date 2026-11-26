import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

const blank = () => ({ impressions: 0, clicks: 0, addToCarts: 0 });

/**
 * LOCAL recommendation analytics (this browser only). Feeds the administrator dashboard later.
 * - impression: a rail was actually seen (visibility based, once per displayed rail)
 * - click: a product in the rail was opened
 * - addToCart: a product was added to the cart straight from the rail
 */
export const useRecAnalyticsStore = createPersistedStore(STORAGE_KEYS.recAnalytics, (set) => {
  const bump = (strategy, field) =>
    set((s) => ({ stats: { ...s.stats, [strategy]: { ...blank(), ...s.stats[strategy], [field]: (s.stats[strategy]?.[field] ?? 0) + 1 } } }));
  return {
    /** @type {Record<string, {impressions: number, clicks: number, addToCarts: number}>} */
    stats: {},
    recordImpression: (strategy) => bump(strategy, "impressions"),
    recordClick: (strategy) => bump(strategy, "clicks"),
    recordAddToCart: (strategy) => bump(strategy, "addToCarts"),
    reset: () => set({ stats: {} }),
  };
});

/** Click-through and add-to-cart rates per strategy, plus overall totals. */
export function summarizeAnalytics(stats) {
  const rows = Object.entries(stats).map(([strategy, s]) => ({
    strategy, ...s,
    ctr: s.impressions ? s.clicks / s.impressions : 0,
    conversion: s.impressions ? s.addToCarts / s.impressions : 0,
  }));
  const total = rows.reduce((t, r) => ({ impressions: t.impressions + r.impressions, clicks: t.clicks + r.clicks, addToCarts: t.addToCarts + r.addToCarts }), blank());
  return { rows, total, ctr: total.impressions ? total.clicks / total.impressions : 0, conversion: total.impressions ? total.addToCarts / total.impressions : 0 };
}
