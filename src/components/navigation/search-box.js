"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, Search, Tag, TrendingUp, X } from "lucide-react";
import { POPULAR_SEARCHES } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import { sanitizeSearchQuery } from "@/lib/validators";
import { formatCategory, formatPrice } from "@/lib/formatters";
import { searchProducts } from "@/services/api/product-api";
import { useCategories } from "@/hooks/use-products";
import { useDebounce } from "@/hooks/use-debounce";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSearchHistoryStore } from "@/store";
import { cn } from "@/lib/utils";

const searchHref = (q) => `/search?q=${encodeURIComponent(q)}`;

/** Search input with debounced live suggestions, category matches, recent and popular searches. */
export function SearchBox({ className }) {
  const router = useRouter();
  const pathname = usePathname();
  const urlQuery = useSearchParams().get("q") ?? "";
  const listId = useId();
  const rootRef = useRef(null);
  const [value, setValue] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Keep the box in sync with the URL (back/forward navigation, shared links).
  useEffect(() => {
    setValue(pathname === "/search" ? urlQuery : "");
  }, [pathname, urlQuery]);

  const hydrated = useHydrated();
  const recent = useSearchHistoryStore((s) => s.terms);
  const recordSearch = useSearchHistoryStore((s) => s.record);
  const clearHistory = useSearchHistoryStore((s) => s.clear);

  const query = sanitizeSearchQuery(value);
  const debounced = useDebounce(query);
  const { data: categories } = useCategories();
  // Only request when there is a debounced query of 2+ characters; empty input never hits the API.
  const { data: suggestionData } = useQuery({
    queryKey: queryKeys.products.search(debounced, { limit: 5 }),
    queryFn: ({ signal }) => searchProducts(debounced, { limit: 5, signal }),
    enabled: open && debounced.length >= 2,
  });

  const items = useMemo(() => {
    if (!query) {
      return [
        ...(hydrated ? recent : []).map((t) => ({ key: `r-${t}`, type: "recent", label: t, href: searchHref(t) })),
        ...POPULAR_SEARCHES.map((t) => ({ key: `p-${t}`, type: "popular", label: t, href: searchHref(t) })),
      ];
    }
    const q = debounced.toLowerCase();
    const cats = (categories ?? [])
      .filter((c) => q.length >= 2 && c.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((c) => ({ key: `c-${c.slug}`, type: "category", label: c.name, href: `/categories/${c.slug}` }));
    const products = (debounced === query ? suggestionData?.products ?? [] : []).map((p) => ({
      key: `pr-${p.id}`,
      type: "product",
      label: p.title,
      meta: formatPrice(p.price),
      href: `/products/${p.id}`,
    }));
    return [...cats, ...products, { key: "all", type: "all", label: `See all results for “${query}”`, href: searchHref(query) }];
  }, [query, debounced, categories, suggestionData, recent, hydrated]);

  useEffect(() => setActive(-1), [items.length, query]);

  function go(item) {
    if (item.type === "recent" || item.type === "popular" || item.type === "all") recordSearch(item.label.startsWith("See all") ? query : item.label);
    setOpen(false);
    router.push(item.href);
  }

  function submit(e) {
    e.preventDefault();
    if (active >= 0 && items[active]) return go(items[active]);
    if (!query) return; // nothing to search for
    recordSearch(query);
    setOpen(false);
    router.push(searchHref(query));
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const icons = { recent: Clock, popular: TrendingUp, category: Tag, product: Search, all: Search };

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <form role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search products
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input
            id={`${listId}-input`}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            maxLength={200}
            placeholder="Search products"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-9 text-sm"
          />
          {value && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setValue("");
                setOpen(true);
              }}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full hover:bg-surface-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-pop">
          {!query && hydrated && recent.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1 text-xs text-ink-soft">
              <span>Recent searches</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearHistory} className="font-medium text-brand-600 underline">
                Clear history
              </button>
            </div>
          )}
          <ul id={listId} role="listbox" aria-label="Search suggestions">
            {items.map((item, i) => {
              const Icon = icons[item.type];
              const header = !query && item.type === "popular" && items[i - 1]?.type !== "popular";
              return (
                <li key={item.key} role="presentation">
                  {header && <p className="px-3 pb-1 pt-2 text-xs text-ink-soft">Popular searches</p>}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(item)}
                    className={cn("flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm", i === active ? "bg-brand-50" : "hover:bg-surface-muted")}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                    <span className="flex-1 truncate">{item.type === "category" ? `${item.label} (category)` : item.label}</span>
                    {item.meta && <span className="text-xs text-ink-soft">{item.meta}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {open ? `${items.length} suggestions available` : ""}
      </p>
    </div>
  );
}
