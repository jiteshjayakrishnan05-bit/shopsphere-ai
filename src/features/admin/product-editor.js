"use client";

import { useState } from "react";
import Link from "next/link";
import { FormField } from "@/components/common/form-field";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/feedback/skeleton";
import { useAdminCatalogue, useRefreshStorefront } from "@/hooks/use-admin-data";
import { useCategories } from "@/hooks/use-products";
import { useAdminProductsStore, useOrdersStore } from "@/store";
import { FIRST_CREATED_ID } from "@/lib/admin-product-model";
import { formatCategory } from "@/lib/formatters";
import { parseProductForm } from "./product-form-validation";
import { PageHeader, btnGhost, btnPrimary, inputCls } from "./admin-ui";

const blank = { title: "", description: "", brand: "", category: "", price: "", discountPercentage: "", stock: "" };
const toValues = (p) => ({ title: p.title, description: p.description, brand: p.brand ?? "", category: p.category, price: String(p.price), discountPercentage: String(p.discountPercentage), stock: String(p.stock) });

function ProductForm({ initial, isNew, canEditCategory, categorySlugs, onSaved, onCancel }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const change = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const { errors: errs, value } = parseProductForm(values, { categorySlugs, editsCategory: canEditCategory });
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSaved(value);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField label="Title" name="title" value={values.title} onChange={change} error={errors.title} />
      <div>
        <label htmlFor="pf-description" className="block text-sm font-medium">
          Description
        </label>
        <textarea id="pf-description" name="description" rows={4} value={values.description} onChange={change} aria-invalid={errors.description ? "true" : undefined} aria-describedby={errors.description ? "pf-description-error" : undefined} className={`${inputCls} mt-1 block w-full`} />
        {errors.description && (
          <p id="pf-description-error" className="mt-1 text-xs text-danger">
            {errors.description}
          </p>
        )}
      </div>
      <FormField label="Brand (optional)" name="brand" value={values.brand} onChange={change} error={errors.brand} />
      {canEditCategory ? (
        <div>
          <label htmlFor="pf-category" className="block text-sm font-medium">
            Category
          </label>
          <select id="pf-category" name="category" value={values.category} onChange={change} aria-invalid={errors.category ? "true" : undefined} className={`${inputCls} mt-1 block w-full`}>
            <option value="">Choose a category</option>
            {categorySlugs.map((s) => (
              <option key={s} value={s}>
                {formatCategory(s)}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-danger">{errors.category}</p>}
        </div>
      ) : (
        <p className="text-sm">
          <span className="font-medium">Category:</span> {formatCategory(values.category)} <span className="text-ink-soft">(imported products keep their category)</span>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Price (₹)" name="price" type="number" inputMode="numeric" min="1" value={values.price} onChange={change} error={errors.price} />
        <FormField label="Discount (%)" name="discountPercentage" type="number" inputMode="numeric" min="0" max="90" value={values.discountPercentage} onChange={change} error={errors.discountPercentage} />
        <FormField label="Stock" name="stock" type="number" inputMode="numeric" min="0" value={values.stock} onChange={change} error={errors.stock} />
      </div>
      <div className="flex gap-3">
        <button type="submit" className={btnPrimary}>
          {isNew ? "Create product" : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          {isNew ? "Cancel" : "Back to products"}
        </button>
      </div>
    </form>
  );
}

/** Add a product (no id) or view and edit one. Saved locally; product images are not part of this demo. */
export function AdminProductEditor({ id }) {
  const isNew = id === undefined;
  const { products, isPending, isError, error, refetch } = useAdminCatalogue();
  const { data: categories } = useCategories();
  const orders = useOrdersStore((s) => s.orders);
  const refresh = useRefreshStorefront();
  const { createProduct, saveEdit } = useAdminProductsStore.getState();
  const [notice, setNotice] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const categorySlugs = (categories ?? []).map((c) => c.slug);
  const goBack = () => window.history.length > 1 ? window.history.back() : (window.location.href = "/admin/products");

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState title="Couldn't load the catalogue" message={error.message} onRetry={refetch} />;

  if (isNew) {
    return (
      <div className="space-y-4">
        <PageHeader title="Add product" subtitle="New products are saved locally in this demo." />
        {notice && (
          <p role="status" className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
            {notice.text} <Link href={`/admin/products/${notice.id}`} className="font-medium underline">View in admin</Link> · <Link href={`/products/${notice.id}`} className="font-medium underline">View in store</Link>
          </p>
        )}
        <div className="max-w-2xl rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <ProductForm
            key={formKey}
            initial={blank}
            isNew
            canEditCategory
            categorySlugs={categorySlugs}
            onCancel={() => (window.location.href = "/admin/products")}
            onSaved={(value) => {
              const newId = createProduct(value);
              refresh();
              setNotice({ id: newId, text: `${value.title} created. Changes saved locally in this demo.` });
              setFormKey((k) => k + 1);
            }}
          />
        </div>
      </div>
    );
  }

  const product = products.find((p) => p.id === Number(id));
  if (!product) {
    return (
      <div className="max-w-md space-y-3 py-10">
        <h1 className="text-xl font-semibold">Product not found</h1>
        <p className="text-sm text-ink-soft">It may have been deleted.</p>
        <Link href="/admin/products" className="text-sm font-medium text-brand-600 underline">
          Back to products
        </Link>
      </div>
    );
  }
  const canEditCategory = product.id >= FIRST_CREATED_ID;
  const inOrders = orders.filter((o) => o.items.some((i) => i.productId === product.id)).length;

  return (
    <div className="space-y-4">
      <PageHeader title={product.title} subtitle={`Product ${product.id}${product.sku ? ` · SKU ${product.sku}` : ""}`} />
      <dl className="grid max-w-2xl grid-cols-2 gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-ink-soft">Status</dt>
          <dd className="font-medium">{product.archived ? "Archived" : "Active"}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Rating</dt>
          <dd className="font-medium">{product.rating.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">In orders</dt>
          <dd className="font-medium">{inOrders}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Storefront</dt>
          <dd className="font-medium">{product.archived ? "Hidden" : <Link href={`/products/${product.id}`} className="text-brand-600 underline">View</Link>}</dd>
        </div>
      </dl>
      <p role="status" className="min-h-5 text-sm text-success">
        {notice?.text}
      </p>
      <div className="max-w-2xl rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <ProductForm
          key={`${product.id}-${formKey}`}
          initial={toValues(product)}
          isNew={false}
          canEditCategory={canEditCategory}
          categorySlugs={categorySlugs}
          onCancel={goBack}
          onSaved={(value) => {
            saveEdit(product.id, value);
            refresh();
            setNotice({ text: "Changes saved locally in this demo." });
          }}
        />
      </div>
    </div>
  );
}
