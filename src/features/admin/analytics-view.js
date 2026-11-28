"use client";

import { useState } from "react";
import seed from "@/data/analytics.json";
import { useRecAnalyticsStore } from "@/store";
import { STRATEGY_LABELS } from "@/services/recommendation/recommendation-strategies";
import { mergeStats, summarizeAnalytics } from "./admin-metrics";
import { PageHeader, Panel, SimulatedBadge, btnGhost } from "./admin-ui";

const pct = (n) => `${(n * 100).toFixed(1)}%`;

/** Recommendation analytics. All numbers are local to this browser, optionally plus demo seed data. */
export function AnalyticsView() {
  const stats = useRecAnalyticsStore((s) => s.stats);
  const reset = useRecAnalyticsStore((s) => s.reset);
  const [includeSeed, setIncludeSeed] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const summary = summarizeAnalytics(mergeStats(stats, seed.seedStrategyStats, includeSeed));
  const rows = [...summary.rows].sort((a, b) => b.clicks - a.clicks || a.strategy.localeCompare(b.strategy));
  const maxCtr = Math.max(0.0001, ...rows.map((r) => r.ctr));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recommendation analytics"
        subtitle="How each recommendation strategy performs."
        actions={
          <span className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium">
            Local Analytics <SimulatedBadge>This browser only</SimulatedBadge>
          </span>
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={includeSeed} onChange={(e) => setIncludeSeed(e.target.checked)} />
        Include demo seed data
      </label>
      <p className="-mt-3 text-xs text-ink-soft">
        {includeSeed ? "Showing the demo seed plus the activity recorded in this browser, so the charts are not empty." : "Showing only the activity recorded in this browser."}
      </p>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          ["Impressions", summary.total.impressions],
          ["Clicks", summary.total.clicks],
          ["Click-through rate", pct(summary.ctr)],
          ["Add to cart", summary.total.addToCarts],
          ["Conversion (add to cart ÷ impressions)", pct(summary.conversion)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <Panel title="Strategy performance">
          <p className="text-sm text-ink-soft">No recommendation activity recorded yet. Browse the store as a customer and come back.</p>
        </Panel>
      ) : (
        <>
          <Panel title="Most popular strategies">
            <ol className="space-y-1 text-sm">
              {rows.slice(0, 3).map((r, i) => (
                <li key={r.strategy}>
                  {i + 1}. <strong>{STRATEGY_LABELS[r.strategy] ?? r.strategy}</strong> <span className="text-ink-soft">({r.clicks} clicks)</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Click-through rate by strategy">
            <ul aria-label="Click-through rate chart" className="space-y-2">
              {rows.map((r) => (
                <li key={r.strategy} className="grid grid-cols-[10rem_1fr_3.5rem] items-center gap-3 text-sm">
                  <span className="truncate">{STRATEGY_LABELS[r.strategy] ?? r.strategy}</span>
                  <span className="h-3 rounded-full bg-surface-muted" aria-hidden="true">
                    <span className="block h-3 rounded-full bg-brand-600" style={{ width: `${Math.round((r.ctr / maxCtr) * 100)}%` }} />
                  </span>
                  <span className="text-right text-ink-soft">{pct(r.ctr)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Strategy details">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">Recommendation strategy performance</caption>
                <thead className="text-xs text-ink-soft">
                  <tr>
                    {["Strategy", "Impressions", "Clicks", "CTR", "Add to cart", "Conversion"].map((h) => (
                      <th key={h} scope="col" className="py-2 pr-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.strategy} className="border-t border-line">
                      <th scope="row" className="py-2 pr-3 font-medium">
                        {STRATEGY_LABELS[r.strategy] ?? r.strategy}
                      </th>
                      <td className="pr-3">{r.impressions}</td>
                      <td className="pr-3">{r.clicks}</td>
                      <td className="pr-3">{pct(r.ctr)}</td>
                      <td className="pr-3">{r.addToCarts}</td>
                      <td>{pct(r.conversion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <div>
        {confirming ? (
          <div role="alertdialog" aria-label="Confirm reset" className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface-muted p-3 text-sm">
            Clear the activity recorded in this browser? The demo seed data is not affected.
            <button type="button" onClick={() => { reset(); setConfirming(false); }} className="rounded-md bg-danger px-4 py-1.5 font-medium text-white">
              Yes, clear it
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={btnGhost}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={btnGhost}>
            Clear recorded activity
          </button>
        )}
      </div>
    </div>
  );
}
