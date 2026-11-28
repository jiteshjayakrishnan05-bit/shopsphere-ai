"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAdminCatalogue, useRefreshStorefront } from "@/hooks/use-admin-data";
import { useCategories } from "@/hooks/use-products";
import { useAdminProductsStore, useOrdersStore } from "@/store";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { formatCategory, formatPrice } from "@/lib/formatters";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/feedback/skeleton";
import { Pagination } from "@/features/products/pagination";
import { filterAdminProducts, referencedProductIds } from "./admin-metrics";
import { PageHeader, btnGhost, btnPrimary, inputCls } from "./admin-ui";

const PAGE_SIZE = 25;
const SAVED = "Changes saved locally in this demo.";

function StockCell({ product, onSave }) {
  const [value, setValue] = useState(String(product.stock));
  const [error, setError] = useState("");
  useEffect(() => setValue(String(product.stock)), [product.stock]);
  function submit(e) {
    e.preventDefault();
    const n = Number(value);
    if (value.trim() === "" || !Number.isInteger(n) || n < 0 || n > 100000) {
      setError("Whole number, 0 to 1,00,000");
      return;
    }
    setError("");
    onSave(product, n);
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <label htmlFor={`stock-${product.id}`} className="sr-only">
          Stock for {product.title}
        </label>
        <input id={`stock-${product.id}`} type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={error ? "true" : undefined} className={`${inputCls} w-20`} />
        <button type="submit" disabled={Number(value) === product.stock} aria-label={`Update stock for ${product.title}`} className="rounded-md border border-line px-2 py-1 text-xs font-medium hover:bg-surface-muted disabled:opacity-40">
          Update
        </button>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
      {product.stock === 0 ? <span className="text-xs font-medium text-danger">Out of stock</span> : product.stock <= LOW_STOCK_THRESHOLD ? <span className="text-xs text-amber-700">Low stock</span> : null}
    </form>
  );
}

export function AdminProductsView() {
  const { products, isPending, isError, error, refetch } = useAdminCatalogue();
  const { data: categories } = useCategories();
  const orders = useOrdersStore((s) => s.orders);
  const refresh = useRefreshStorefront();
  const { setStock, archiveProduct, restoreProduct, deleteProduct } = useAdminProductsStore.getState();
  const referenced = useMemo(() => referencedProductIds(orders), [orders]);
  const orderCount = (id) => orders.filter((o) => o.items.some((i) => i.productId === id)).length;

  const [filters, setFilters] = useState({ query: "", category: "all", stock: "all", status: "active" });
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => filterAdminProducts(products, filters, LOW_STOCK_THRESHOLD), [products, filters]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const change = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const done = (text) => {
    refresh();
    setNotice(`${text} ${SAVED}`);
    setConfirmDelete(null);
    setBlocked(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        subtitle="Search, update stock, edit, archive or delete products."
        actions={
          <Link href="/admin/products/new" className={`${btnPrimary} inline-flex items-center gap-1.5`}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add product
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-ink-soft">Search</span>
          <input type="search" value={filters.query} onChange={(e) => change({ query: e.target.value })} placeholder="Title, brand, SKU or ID" className={`${inputCls} w-56`} />
        </label>
        <label className="text-sm">
          <span className="block text-ink-soft">Category</span>
          <select value={filters.category} onChange={(e) => change({ category: e.target.value })} className={inputCls}>
            <option value="all">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {formatCategory(c.slug)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-ink-soft">Stock</span>
          <select value={filters.stock} onChange={(e) => change({ stock: e.target.value })} className={inputCls}>
            <option value="all">All</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-ink-soft">Status</span>
          <select value={filters.status} onChange={(e) => change({ status: e.target.value })} className={inputCls}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <p role="status" className="min-h-5 text-sm text-success">
        {notice}
      </p>

      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState title="Couldn't load products" message={error.message} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center text-sm">
          <p className="font-medium">No products match these filters.</p>
          <button type="button" onClick={() => { setFilters({ query: "", category: "all", stock: "all", status: "active" }); setPage(1); }} className="mt-3 font-medium text-brand-600 underline">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            {rows.length} {rows.length === 1 ? "product" : "products"}
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <caption className="sr-only">Products</caption>
              <thead className="border-b border-line text-xs text-ink-soft">
                <tr>
                  {["Product", "Category", "Price", "Stock", "Actions"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-t border-line align-top">
                    <td className="px-3 py-3">
                      <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                        {p.title}
                      </Link>
                      {p.archived && <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-xs">Archived</span>}
                      <p className="text-xs text-ink-soft">ID {p.id}</p>
                    </td>
                    <td className="px-3 py-3">{formatCategory(p.category)}</td>
                    <td className="px-3 py-3">{formatPrice(p.price)}</td>
                    <td className="px-3 py-3">
                      <StockCell product={p} onSave={(prod, n) => { setStock(prod.id, n); done(`Stock for ${prod.title} is now ${n}.`); }} />
                    </td>
                    <td className="px-3 py-3">
                      {blocked === p.id ? (
                        <div role="alert" className="max-w-xs text-xs">
                          <p className="text-danger">
                            Can&apos;t delete: this product is in {orderCount(p.id)} {orderCount(p.id) === 1 ? "order" : "orders"}. Archive it instead to hide it from the store and keep order history intact.
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => { archiveProduct(p.id); done(`${p.title} archived.`); }} className="font-medium text-brand-600 underline">
                              Archive instead
                            </button>
                            <button type="button" onClick={() => setBlocked(null)} className="underline">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : confirmDelete === p.id ? (
                        <div role="alertdialog" aria-label="Confirm delete" className="text-xs">
                          Delete permanently?
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => { deleteProduct(p.id, referenced) ? done(`${p.title} deleted.`) : setBlocked(p.id); }} className="font-medium text-danger underline">
                              Yes, delete
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(null)} className="underline">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <Link href={`/admin/products/${p.id}`} aria-label={`Edit ${p.title}`} className="text-brand-600 hover:underline">
                            Edit
                          </Link>
                          {p.archived ? (
                            <button type="button" onClick={() => { restoreProduct(p.id); done(`${p.title} restored to the store.`); }} aria-label={`Restore ${p.title}`} className="text-brand-600 hover:underline">
                              Restore
                            </button>
                          ) : (
                            <button type="button" onClick={() => { archiveProduct(p.id); done(`${p.title} archived.`); }} aria-label={`Archive ${p.title}`} className="text-brand-600 hover:underline">
                              Archive
                            </button>
                          )}
                          <button type="button" onClick={() => (referenced.has(p.id) ? setBlocked(p.id) : setConfirmDelete(p.id))} aria-label={`Delete ${p.title}`} className="text-danger hover:underline">
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={current} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </div>
  );
}
