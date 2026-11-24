"use client";

import { X } from "lucide-react";
import { formatCategory, formatPrice } from "@/lib/formatters";
import { countActiveFilters } from "./catalogue-params";

function Chip({ label, onRemove }) {
  return (
    <li>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs hover:bg-surface-muted"
      >
        {label}
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </li>
  );
}

export function ActiveFilters({ params, onChange, onClear }) {
  if (countActiveFilters(params) === 0) return null;
  const { minPrice, maxPrice } = params;
  const priceLabel =
    minPrice !== null && maxPrice !== null
      ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
      : minPrice !== null
        ? `From ${formatPrice(minPrice)}`
        : `Up to ${formatPrice(maxPrice)}`;
  return (
    <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {(minPrice !== null || maxPrice !== null) && <Chip label={priceLabel} onRemove={() => onChange({ minPrice: null, maxPrice: null })} />}
      {params.minRating !== null && <Chip label={`${params.minRating}★ & up`} onRemove={() => onChange({ minRating: null })} />}
      {params.stock !== "all" && <Chip label={params.stock === "in" ? "In stock" : "Out of stock"} onRemove={() => onChange({ stock: "all" })} />}
      {params.onSale && <Chip label="On sale" onRemove={() => onChange({ onSale: false })} />}
      {params.categories.map((c) => (
        <Chip key={c} label={formatCategory(c)} onRemove={() => onChange({ categories: params.categories.filter((x) => x !== c) })} />
      ))}
      {params.brands.map((b) => (
        <Chip key={b} label={b} onRemove={() => onChange({ brands: params.brands.filter((x) => x !== b) })} />
      ))}
      <li>
        <button type="button" onClick={onClear} className="text-xs font-medium text-brand-600 underline">
          Clear filters
        </button>
      </li>
    </ul>
  );
}
