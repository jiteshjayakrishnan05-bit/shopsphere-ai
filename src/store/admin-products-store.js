import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";
import { EDITABLE_API_FIELDS, FIRST_CREATED_ID, buildCreatedProduct, slugify, withDerived } from "@/lib/admin-product-model";

export const initialAdminState = () => ({ edits: {}, created: [], deletedIds: [], archivedIds: [], customCategories: [], nextId: FIRST_CREATED_ID });

const pickEditable = (fields) => Object.fromEntries(Object.entries(fields).filter(([k]) => EDITABLE_API_FIELDS.includes(k)));

/**
 * LOCAL admin changes to the catalogue. DummyJSON writes are simulated, so everything an administrator
 * changes lives here (localStorage) and is layered over the API data. Nothing reaches a real database.
 */
export const useAdminProductsStore = createPersistedStore(
  STORAGE_KEYS.adminProducts,
  (set, get) => ({
    ...initialAdminState(),

    /** Create a product; returns its new id. */
    createProduct: (fields) => {
      const id = get().nextId;
      set((s) => ({ created: [...s.created, buildCreatedProduct(id, fields)], nextId: s.nextId + 1 }));
      return id;
    },

    /** Edit a product. Created products can change any field; imported ones only the editable ones (not category). */
    saveEdit: (id, fields) =>
      set((s) => {
        if (s.created.some((p) => p.id === id)) {
          return { created: s.created.map((p) => (p.id === id ? withDerived({ ...p, ...fields, title: String(fields.title ?? p.title).trim() }) : p)) };
        }
        return { edits: { ...s.edits, [id]: { ...s.edits[id], ...pickEditable(fields) } } };
      }),

    setStock: (id, stock) => get().saveEdit(id, { stock }),

    /** Archive hides a product from the storefront but keeps it (and every order that mentions it). */
    archiveProduct: (id) => set((s) => (s.archivedIds.includes(id) ? s : { archivedIds: [...s.archivedIds, id] })),
    restoreProduct: (id) => set((s) => ({ archivedIds: s.archivedIds.filter((x) => x !== id) })),

    /**
     * Delete a product. Refused (returns false) when any order references it, so order history never breaks.
     * @param {number} id
     * @param {Set<number>|number[]} referencedIds product ids that appear in orders
     */
    deleteProduct: (id, referencedIds = []) => {
      if (new Set(referencedIds).has(id)) return false;
      set((s) => {
        const isCreated = s.created.some((p) => p.id === id);
        const { [id]: _drop, ...edits } = s.edits;
        return {
          created: s.created.filter((p) => p.id !== id),
          edits,
          archivedIds: s.archivedIds.filter((x) => x !== id),
          deletedIds: isCreated || s.deletedIds.includes(id) ? s.deletedIds : [...s.deletedIds, id],
        };
      });
      return true;
    },

    /** Reduce stock after an order is placed. `items` carry the live stock seen at checkout. */
    commitOrderStock: (items) => {
      const sold = new Map();
      for (const i of items) sold.set(i.productId, { stock: i.stock, quantity: (sold.get(i.productId)?.quantity ?? 0) + i.quantity });
      for (const [productId, { stock, quantity }] of sold) get().saveEdit(productId, { stock: Math.max(0, stock - quantity) });
    },

    /** @returns {{ok: true, slug: string} | {ok: false, error: string}} */
    addCategory: (name, existingSlugs = []) => {
      const clean = String(name ?? "").trim();
      const slug = slugify(clean);
      if (clean.length < 2 || !slug) return { ok: false, error: "Enter a category name of at least 2 characters." };
      if (existingSlugs.includes(slug)) return { ok: false, error: "A category with that name already exists." };
      set((s) => ({ customCategories: [...s.customCategories, { slug, name: clean }] }));
      return { ok: true, slug };
    },

    /** Renaming a custom category changes its slug too, and moves the products that use it. */
    renameCategory: (slug, name, existingSlugs = []) => {
      const clean = String(name ?? "").trim();
      const next = slugify(clean);
      if (clean.length < 2 || !next) return { ok: false, error: "Enter a category name of at least 2 characters." };
      if (next !== slug && existingSlugs.includes(next)) return { ok: false, error: "A category with that name already exists." };
      if (!get().customCategories.some((c) => c.slug === slug)) return { ok: false, error: "Only categories you created can be renamed." };
      set((s) => ({
        customCategories: s.customCategories.map((c) => (c.slug === slug ? { slug: next, name: clean } : c)),
        created: s.created.map((p) => (p.category === slug ? { ...p, category: next } : p)),
      }));
      return { ok: true, slug: next };
    },

    /** Only custom categories with no products can be removed. */
    removeCategory: (slug, usedSlugs = []) => {
      if (!get().customCategories.some((c) => c.slug === slug)) return { ok: false, error: "Built-in categories cannot be removed." };
      if (usedSlugs.includes(slug)) return { ok: false, error: "This category still has products. Move or delete them first." };
      set((s) => ({ customCategories: s.customCategories.filter((c) => c.slug !== slug) }));
      return { ok: true };
    },

    resetAdminChanges: () => set(initialAdminState()),
  }),
  { version: 1 },
);
