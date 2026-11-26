"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCatalogueSource } from "@/hooks/use-catalogue-source";
import { formatCategory } from "@/lib/formatters";
import { Skeleton } from "@/components/feedback/skeleton";

/** "Shop by category" tiles built from the catalogue (largest categories first). */
export function CategoryDiscovery({ limit = 8 }) {
  const { data, isPending, isError } = useCatalogueSource({ type: "all" });
  const tiles = useMemo(() => {
    const groups = new Map();
    (data ?? []).forEach((p) => {
      const g = groups.get(p.category) ?? { slug: p.category, count: 0, thumbnail: p.thumbnail };
      g.count += 1;
      groups.set(p.category, g);
    });
    return [...groups.values()].sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug)).slice(0, limit);
  }, [data, limit]);

  if (isError && !data) return null;
  return (
    <section className="mt-12" aria-labelledby="discover-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="discover-heading" className="text-lg font-semibold">
          Shop by category
        </h2>
        <Link href="/products" className="text-sm font-medium text-brand-600 underline">
          View all products
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isPending
          ? Array.from({ length: 8 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-36 w-full" />
              </li>
            ))
          : tiles.map((t) => (
              <li key={t.slug}>
                <Link href={`/categories/${t.slug}`} className="block overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card hover:bg-surface-muted">
                  <div className="relative aspect-[4/3] bg-surface-muted">
                    {t.thumbnail && <Image src={t.thumbnail} alt="" fill sizes="(min-width: 640px) 25vw, 50vw" className="object-contain p-3" />}
                  </div>
                  <p className="p-3 text-sm font-medium">
                    {formatCategory(t.slug)} <span className="font-normal text-ink-soft">({t.count})</span>
                  </p>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}
