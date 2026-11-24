"use client";

import Link from "next/link";
import { Scale, X } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCompareStore } from "@/store";

/** Sticky tray shown while products are selected for comparison. */
export function CompareBar() {
  const hydrated = useHydrated();
  const ids = useCompareStore((s) => s.ids);
  const clear = useCompareStore((s) => s.clear);
  if (!hydrated || ids.length === 0) return null;
  const ready = ids.length >= 2;
  return (
    <div role="region" aria-label="Product comparison" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface shadow-pop">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
        <Scale className="h-5 w-5 text-brand-600" aria-hidden="true" />
        <p className="flex-1 text-sm">
          <strong>{ids.length}</strong> of 4 selected{!ready && <span className="text-ink-soft"> · pick at least 2 to compare</span>}
        </p>
        <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:underline">
          <X className="h-4 w-4" aria-hidden="true" /> Clear
        </button>
        {ready ? (
          <Link href="/compare" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Compare now
          </Link>
        ) : (
          <button type="button" disabled className="rounded-md bg-surface-muted px-4 py-2 text-sm font-medium text-ink-soft">
            Compare now
          </button>
        )}
      </div>
    </div>
  );
}
