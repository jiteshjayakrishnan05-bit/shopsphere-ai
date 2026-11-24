"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page numbers with ellipses, e.g. 1 … 4 5 6 … 9 */
export function pageWindow(current, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;
  const btn = "grid h-9 min-w-9 place-items-center rounded-md border border-line bg-surface px-2 text-sm hover:bg-surface-muted disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1">
      <button type="button" className={btn} onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-ink-soft">
            …
          </span>
        ) : (
          <button key={p} type="button" onClick={() => onChange(p)} aria-label={`Page ${p}`} aria-current={p === page ? "page" : undefined} className={cn(btn, p === page && "border-brand-600 bg-brand-600 text-white hover:bg-brand-600")}>
            {p}
          </button>
        ),
      )}
      <button type="button" className={btn} onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="Next page">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
