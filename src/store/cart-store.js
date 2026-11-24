import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * @typedef {Object} CartItem
 * @property {number} productId
 * @property {number} quantity
 * @property {{title: string, price: number, thumbnail: string, stock: number, category: string}} snapshot
 *   Last-known product data. Kept so the cart still renders if the API fails or the product disappears.
 */

/** Clamp a requested quantity to [1, stock]. */
export function clampQuantity(quantity, stock) {
  const q = Math.max(1, Math.floor(Number(quantity) || 1));
  return stock > 0 ? Math.min(q, stock) : q;
}

export const useCartStore = createPersistedStore(STORAGE_KEYS.cart, (set) => ({
  /** @type {CartItem[]} */
  items: [],
  /** @type {CartItem[]} */
  savedForLater: [],

  /** Add a product. Duplicate products increment the existing line, never exceeding stock. */
  addItem: (product, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      const snapshot = {
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
        stock: product.stock,
        category: product.category,
      };
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === product.id
              ? { ...i, snapshot, quantity: clampQuantity(i.quantity + quantity, product.stock) }
              : i,
          ),
        };
      }
      return {
        items: [...state.items, { productId: product.id, quantity: clampQuantity(quantity, product.stock), snapshot }],
      };
    }),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity: clampQuantity(quantity, i.snapshot.stock) } : i,
      ),
    })),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

  clear: () => set({ items: [] }),
}));

/** Total number of units in the cart. */
export const selectCartCount = (state) => state.items.reduce((n, i) => n + i.quantity, 0);
