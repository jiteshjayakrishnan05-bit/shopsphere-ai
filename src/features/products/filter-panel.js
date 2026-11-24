"use client";

import { useEffect, useState } from "react";
import { formatCategory } from "@/lib/formatters";

const RATING_OPTIONS = [
  { value: null, label: "Any rating" },
  { value: 4, label: "4 stars & up" },
  { value: 3, label: "3 stars & up" },
];
const STOCK_OPTIONS = [
  { value: "all", label: "All" },
  { value: "in", label: "In stock" },
  { value: "out", label: "Out of stock" },
];

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * @param {{facets: ReturnType<import("./catalogue-filter").getFacets>, params: import("./catalogue-params").CatalogueParams,
 *   onChange: (patch: object) => void, showCategories?: boolean}} props
 */
export function FilterPanel({ facets, params, onChange, showCategories = true }) {
  const [minDraft, setMinDraft] = useState(params.minPrice ?? "");
  const [maxDraft, setMaxDraft] = useState(params.maxPrice ?? "");
  const [priceError, setPriceError] = useState("");

  // Keep each draft in sync with the URL (chips, back/forward, clear). Separate effects so
  // applying one bound never overwrites what the user is still typing in the other.
  useEffect(() => {
    setMinDraft(params.minPrice ?? "");
    setPriceError("");
  }, [params.minPrice]);
  useEffect(() => {
    setMaxDraft(params.maxPrice ?? "");
    setPriceError("");
  }, [params.maxPrice]);

  function applyPrice() {
    const min = minDraft === "" ? null : Number(minDraft);
    const max = maxDraft === "" ? null : Number(maxDraft);
    if ((min !== null && !(min >= 0)) || (max !== null && !(max >= 0))) {
      setPriceError("Enter prices of 0 or more.");
      return;
    }
    if (min !== null && max !== null && min > max) {
      setPriceError("Minimum can't be higher than maximum.");
      return;
    }
    setPriceError("");
    if (min !== params.minPrice || max !== params.maxPrice) onChange({ minPrice: min, maxPrice: max });
  }
  const onPriceKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyPrice();
    }
  };

  const inputCls = "w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm";

  return (
    <div className="space-y-6 text-sm">
      <fieldset>
        <legend className="mb-2 font-semibold">Price (₹)</legend>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="sr-only">Minimum price</span>
            <input type="number" min="0" inputMode="numeric" placeholder="Min" value={minDraft} onChange={(e) => setMinDraft(e.target.value)} onBlur={applyPrice} onKeyDown={onPriceKey} aria-invalid={priceError ? "true" : undefined} className={inputCls} />
          </label>
          <span aria-hidden="true">–</span>
          <label className="flex-1">
            <span className="sr-only">Maximum price</span>
            <input type="number" min="0" inputMode="numeric" placeholder="Max" value={maxDraft} onChange={(e) => setMaxDraft(e.target.value)} onBlur={applyPrice} onKeyDown={onPriceKey} aria-invalid={priceError ? "true" : undefined} className={inputCls} />
          </label>
        </div>
        {priceError && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {priceError}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Rating</legend>
        {RATING_OPTIONS.map((o) => (
          <label key={o.label} className="flex items-center gap-2 py-1">
            <input type="radio" name="rating" checked={params.minRating === o.value} onChange={() => onChange({ minRating: o.value })} />
            {o.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Availability</legend>
        {STOCK_OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2 py-1">
            <input type="radio" name="stock" checked={params.stock === o.value} onChange={() => onChange({ stock: o.value })} />
            {o.label}
          </label>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" checked={params.onSale} onChange={(e) => onChange({ onSale: e.target.checked })} />
        On sale only
      </label>

      {showCategories && facets.categories.length > 1 && (
        <fieldset>
          <legend className="mb-2 font-semibold">Category</legend>
          <div className="max-h-48 overflow-y-auto pr-1">
            {facets.categories.map((c) => (
              <label key={c.value} className="flex items-center gap-2 py-1">
                <input type="checkbox" checked={params.categories.includes(c.value)} onChange={() => onChange({ categories: toggleIn(params.categories, c.value) })} />
                <span className="flex-1">{formatCategory(c.value)}</span>
                <span className="text-xs text-ink-soft">{c.count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {facets.brands.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-semibold">Brand</legend>
          <div className="max-h-48 overflow-y-auto pr-1">
            {facets.brands.map((b) => (
              <label key={b.value} className="flex items-center gap-2 py-1">
                <input type="checkbox" checked={params.brands.includes(b.value)} onChange={() => onChange({ brands: toggleIn(params.brands, b.value) })} />
                <span className="flex-1">{b.value}</span>
                <span className="text-xs text-ink-soft">{b.count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
