import { describe, it, expect, beforeEach } from "vitest";
import { summarizeAnalytics, useRecAnalyticsStore } from "@/store/recommendation-analytics-store";

const s = () => useRecAnalyticsStore.getState();
beforeEach(() => {
  localStorage.clear();
  useRecAnalyticsStore.setState({ stats: {} });
});

describe("recommendation analytics store", () => {
  it("counts impressions, clicks and add-to-carts per strategy", () => {
    s().recordImpression("trending");
    s().recordImpression("trending");
    s().recordClick("trending");
    s().recordAddToCart("similar");
    expect(s().stats.trending).toEqual({ impressions: 2, clicks: 1, addToCarts: 0 });
    expect(s().stats.similar).toEqual({ impressions: 0, clicks: 0, addToCarts: 1 });
  });
  it("summarises click-through and conversion rates", () => {
    for (let i = 0; i < 4; i++) s().recordImpression("trending");
    s().recordClick("trending");
    s().recordAddToCart("trending");
    s().recordImpression("cart");
    const sum = summarizeAnalytics(s().stats);
    const t = sum.rows.find((r) => r.strategy === "trending");
    expect(t.ctr).toBe(0.25);
    expect(t.conversion).toBe(0.25);
    expect(sum.total).toEqual({ impressions: 5, clicks: 1, addToCarts: 1 });
    expect(sum.ctr).toBeCloseTo(0.2, 10);
  });
  it("handles zero impressions without dividing by zero, and resets", () => {
    s().recordClick("x");
    expect(summarizeAnalytics(s().stats).rows[0].ctr).toBe(0);
    s().reset();
    expect(s().stats).toEqual({});
    expect(summarizeAnalytics({}).ctr).toBe(0);
  });
});
