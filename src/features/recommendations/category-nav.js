"use client";

import Link from "next/link";
import { useCategories } from "@/hooks/use-products";
import { formatCategory } from "@/lib/formatters";

/** Horizontal category chips under the hero. Renders nothing if categories can't be loaded. */
export function CategoryNav() {
  const { data } = useCategories();
  if (!data?.length) return null;
  return (
    <nav aria-label="Browse categories" className="mt-6">
      <ul className="flex gap-2 overflow-x-auto pb-2">
        {data.map((c) => (
          <li key={c.slug} className="shrink-0">
            <Link href={`/categories/${c.slug}`} className="block rounded-full border border-line bg-surface px-4 py-1.5 text-sm hover:bg-surface-muted">
              {formatCategory(c.slug)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
