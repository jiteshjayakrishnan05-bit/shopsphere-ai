"use client";

import { useMemo, useState } from "react";
import { useAdminCatalogue, useRefreshStorefront } from "@/hooks/use-admin-data";
import { useCategories } from "@/hooks/use-products";
import { useAdminProductsStore } from "@/store";
import { formatCategory } from "@/lib/formatters";
import { Skeleton } from "@/components/feedback/skeleton";
import { PageHeader, btnGhost, btnPrimary, inputCls } from "./admin-ui";

/** Add, rename and remove categories. Built-in DummyJSON categories are read-only. */
export function AdminCategoriesView() {
  const { data: categories, isPending } = useCategories();
  const { products } = useAdminCatalogue();
  const custom = useAdminProductsStore((s) => s.customCategories);
  const refresh = useRefreshStorefront();
  const { addCategory, renameCategory, removeCategory } = useAdminProductsStore.getState();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const counts = useMemo(() => {
    const map = {};
    products.forEach((p) => (map[p.category] = (map[p.category] ?? 0) + 1));
    return map;
  }, [products]);
  const slugs = (categories ?? []).map((c) => c.slug);
  const used = Object.keys(counts).filter((k) => counts[k] > 0);
  const isCustom = (slug) => custom.some((c) => c.slug === slug);
  const finish = (text) => {
    refresh();
    setNotice(`${text} Changes saved locally in this demo.`);
    setError("");
  };

  function add(e) {
    e.preventDefault();
    const r = addCategory(name, slugs);
    if (!r.ok) return setError(r.error);
    setName("");
    finish(`Category “${name.trim()}” added.`);
  }
  function rename(slug) {
    const r = renameCategory(slug, draft, slugs);
    if (!r.ok) return setError(r.error);
    setRenaming(null);
    finish("Category renamed.");
  }
  function remove(slug) {
    const r = removeCategory(slug, used);
    if (!r.ok) return setError(r.error);
    finish("Category removed.");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Categories" subtitle="Categories you add can be used for new products." />

      <form onSubmit={add} noValidate className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-ink-soft">New category name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-64`} />
        </label>
        <button type="submit" className={btnPrimary}>
          Add category
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p role="status" className="min-h-5 text-sm text-success">
        {notice}
      </p>

      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <ul aria-label="Categories" className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {(categories ?? []).map((c) => (
            <li key={c.slug} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              {renaming === c.slug ? (
                <>
                  <label className="flex items-center gap-2">
                    <span className="sr-only">New name for {c.name}</span>
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} />
                  </label>
                  <button type="button" onClick={() => rename(c.slug)} className={btnPrimary}>
                    Save name
                  </button>
                  <button type="button" onClick={() => { setRenaming(null); setError(""); }} className={btnGhost}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium">{isCustom(c.slug) ? c.name : formatCategory(c.slug)}</span>
                  <span className="text-xs text-ink-soft">
                    {counts[c.slug] ?? 0} {(counts[c.slug] ?? 0) === 1 ? "product" : "products"}
                  </span>
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">{isCustom(c.slug) ? "Custom" : "Built-in"}</span>
                  {isCustom(c.slug) && (
                    <span className="ml-auto flex gap-3">
                      <button type="button" onClick={() => { setRenaming(c.slug); setDraft(c.name); setError(""); }} aria-label={`Rename ${c.name}`} className="text-brand-600 hover:underline">
                        Rename
                      </button>
                      <button type="button" onClick={() => remove(c.slug)} aria-label={`Delete ${c.name}`} className="text-danger hover:underline">
                        Delete
                      </button>
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
