"use client";

import Image from "next/image";
import Link from "next/link";
import { Scale, X } from "lucide-react";
import { useProductsByIds } from "@/hooks/use-products";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCompareStore } from "@/store";
import { formatCategory, formatPrice, truncate } from "@/lib/formatters";
import { Skeleton } from "@/components/feedback/skeleton";

const dims = (p) => {
  const d = p.raw?.dimensions;
  return d && d.width != null ? [d.width, d.height, d.depth].map((n) => Number(n).toFixed(2)).join(" × ") : "—";
};

const ROWS = [
  ["Brand", (p) => p.brand ?? "—"],
  ["Category", (p) => formatCategory(p.category)],
  ["Price", (p) => formatPrice(p.price)],
  ["Rating", (p) => `${p.rating.toFixed(1)} / 5`],
  ["Discount", (p) => (p.discountPercentage > 0 ? `${p.discountPercentage}% off` : "None")],
  ["Availability", (p) => (p.inStock ? `In stock (${p.stock})` : "Out of stock")],
  ["Description", (p) => truncate(p.description, 140)],
  ["Weight", (p) => (p.raw?.weight != null ? String(p.raw.weight) : "—")],
  ["Dimensions (W × H × D)", dims],
  ["Warranty", (p) => p.raw?.warrantyInformation ?? "—"],
];

export function CompareView() {
  const hydrated = useHydrated();
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const results = useProductsByIds(ids);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (ids.length < 2) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Scale className="mx-auto h-10 w-10 text-ink-soft" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-semibold">Pick products to compare</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {ids.length === 0 ? "Choose between 2 and 4 products using the Compare button on any product." : "You've picked 1 product. Add at least one more."}
        </p>
        <Link href="/products" className="mt-5 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Compare products</h1>
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">Side-by-side product comparison</caption>
          <thead>
            <tr>
              <td className="w-40 p-3" />
              {ids.map((id, i) => {
                const r = results[i];
                const p = r?.data;
                return (
                  <th key={id} scope="col" className="min-w-48 p-3 text-left align-top font-normal">
                    {!r || r.isPending ? (
                      <Skeleton className="h-40 w-full" />
                    ) : p ? (
                      <>
                        <Link href={`/products/${p.id}`} className="relative mx-auto block h-32 w-32 overflow-hidden rounded-lg bg-surface-muted">
                          {p.thumbnail && <Image src={p.thumbnail} alt="" fill sizes="128px" className="object-contain" />}
                        </Link>
                        <Link href={`/products/${p.id}`} className="mt-2 block font-medium hover:underline">
                          {p.title}
                        </Link>
                      </>
                    ) : (
                      <p className="text-danger">{r.error?.status === 404 ? "No longer available" : "Couldn't load"}</p>
                    )}
                    <button type="button" onClick={() => remove(id)} aria-label={`Remove ${p?.title ?? `product ${id}`} from comparison`} className="mt-2 inline-flex items-center gap-1 text-xs text-danger hover:underline">
                      <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, get]) => (
              <tr key={label} className="border-t border-line">
                <th scope="row" className="p-3 text-left font-medium text-ink-soft">
                  {label}
                </th>
                {ids.map((id, i) => (
                  <td key={id} className="p-3 align-top">
                    {results[i]?.data ? get(results[i].data) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
