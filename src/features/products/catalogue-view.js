"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchX, SlidersHorizontal, WifiOff } from "lucide-react";
import { PAGE_SIZE, POPULAR_SEARCHES } from "@/lib/constants";
import { useCatalogueSource } from "@/hooks/use-catalogue-source";
import { ProductCard } from "@/components/products/product-card";
import { ProductCardSkeleton } from "@/components/feedback/skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { applyCatalogue, filterProducts, getFacets } from "./catalogue-filter";
import { countActiveFilters } from "./catalogue-params";
import { useCatalogueParams } from "./use-catalogue-params";
import { FilterPanel } from "./filter-panel";
import { FilterDrawer } from "./filter-drawer";
import { ActiveFilters } from "./active-filters";
import { SortSelect } from "./sort-select";
import { Pagination } from "./pagination";

/**
 * Shared catalogue UI for /products, /categories/[category] and /search.
 * @param {{source: {type: "all"}|{type: "category", category: string}|{type: "search", query: string}, title: string, subtitle?: string}} props
 */
export function CatalogueView({ source, title, subtitle }) {
  const { params, update, clearFilters } = useCatalogueParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isPending, isError, error, refetch, isRefetchError, fetchStatus } = useCatalogueSource(source);
  const showCategories = source.type !== "category";
  const emptyQuery = source.type === "search" && !source.query;

  const facets = useMemo(() => getFacets(data ?? []), [data]);
  const result = useMemo(() => applyCatalogue(data ?? [], params, PAGE_SIZE), [data, params]);
  const filterCount = countActiveFilters(params);

  const changePage = (page) => {
    update({ page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filterPanel = <FilterPanel facets={facets} params={params} onChange={update} showCategories={showCategories} />;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </header>

      {emptyQuery ? (
        <div className="mt-10 rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
          <SearchX className="mx-auto h-8 w-8 text-ink-soft" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">What are you looking for?</h2>
          <p className="mt-1 text-sm text-ink-soft">Type in the search box, or try a popular search.</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCHES.map((t) => (
              <li key={t}>
                <Link href={`/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-line px-3 py-1 text-sm hover:bg-surface-muted">
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : isPending && fetchStatus !== "idle" ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
          {Array.from({ length: 8 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : isError && !data ? (
        <div className="mt-6">
          <ErrorState title="Couldn't load products" message={error.message} onRetry={refetch} />
        </div>
      ) : (
        <div className="mt-6 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8">
          <aside aria-label="Filters" className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
              <h2 className="mb-4 text-base font-semibold">Filters</h2>
              {filterPanel}
            </div>
          </aside>

          <section aria-label="Results" id="results">
            {isRefetchError && (
              <div role="status" className="mb-4 flex items-center gap-2 rounded-md border border-line bg-surface-muted px-3 py-2 text-sm">
                <WifiOff className="h-4 w-4" aria-hidden="true" />
                Showing saved results. We couldn&apos;t refresh them.
                <button type="button" onClick={() => refetch()} className="ml-auto font-medium text-brand-600 underline">
                  Retry
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" aria-live="polite" className="text-sm text-ink-soft">
                {result.total} {result.total === 1 ? "product" : "products"}
                {filterCount > 0 && " match your filters"}
              </p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-sm lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  Filters{filterCount > 0 && ` (${filterCount})`}
                </button>
                <SortSelect value={params.sort} onChange={(sort) => update({ sort })} />
              </div>
            </div>
            <div className="mt-3">
              <ActiveFilters params={params} onChange={update} onClear={clearFilters} />
            </div>

            {result.total === 0 ? (
              <EmptyResults hasData={(data ?? []).length > 0} filterCount={filterCount} query={source.type === "search" ? source.query : ""} onClear={clearFilters} />
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {result.items.map((p, i) => (
                    <ProductCard key={p.id} product={p} priority={i < 4} />
                  ))}
                </div>
                <Pagination page={result.page} pageCount={result.pageCount} onChange={changePage} />
              </>
            )}
          </section>
        </div>
      )}

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} resultCount={result.total}>
        {filterPanel}
      </FilterDrawer>
    </div>
  );
}

function EmptyResults({ hasData, filterCount, query, onClear }) {
  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
      <SearchX className="mx-auto h-8 w-8 text-ink-soft" aria-hidden="true" />
      <h2 className="mt-3 font-semibold">{query && !hasData ? `No results for “${query}”` : "No products match these filters"}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {filterCount > 0 && hasData ? "Try removing a filter or widening the price range." : "Check the spelling or try a more general word."}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {filterCount > 0 && (
          <button type="button" onClick={onClear} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Clear filters
          </button>
        )}
        {POPULAR_SEARCHES.slice(0, 3).map((t) => (
          <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-muted">
            {t}
          </Link>
        ))}
      </div>
    </div>
  );
}
