import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * @typedef {Object} CartItem
 * @property {string} lineId        `${productId}` or `${productId}:${variant}`; one line per product+variant
 * @property {number} productId
 * @property {string|null} variant  e.g. "M" or "Black" (demo variant fixture)
 * @property {number} quantity
 * @property {{title: string, price: number, thumbnail: string, stock: number, category: string}} snapshot
 *   Last-known product data. Kept so the cart still renders if the API fails or the product disappears.
 */

export const lineIdOf = (productId, variant = null) => (variant ? `${productId}:${variant}` : String(productId));

/** Clamp a requested quantity to [1, stock] (stock 0 leaves it at least 1 so the line stays visible). */
export function clampQuantity(quantity, stock) {
  const q = Math.max(1, Math.floor(Number(quantity) || 1));
  return stock > 0 ? Math.min(q, stock) : q;
}

const snapshotOf = (p) => ({
  title: p.title,
  price: p.price,
  thumbnail: p.thumbnail,
  stock: p.stock,
  category: p.category,
});

/** Units of a product held by lines other than `exceptLineId` (stock is shared across variants). */
const reservedElsewhere = (items, productId, exceptLineId) =>
  items.filter((i) => i.productId === productId && i.lineId !== exceptLineId).reduce((n, i) => n + i.quantity, 0);

// v2 added lineId/variant/couponCode. Migrate carts saved by earlier builds instead of dropping them.
function migrate(persisted, version) {
  if (version >= 2 || !persisted) return persisted;
  const upgrade = (i) => ({ variant: null, lineId: String(i.productId), ...i });
  return { ...persisted, items: (persisted.items ?? []).map(upgrade), savedForLater: (persisted.savedForLater ?? []).map(upgrade), couponCode: null };
}

export const useCartStore = createPersistedStore(
  STORAGE_KEYS.cart,
  (set) => ({
    /** @type {CartItem[]} */
    items: [],
    /** @type {CartItem[]} */
    savedForLater: [],
    /** @type {string|null} */
    couponCode: null,

    /** Add a product. The same product+variant increments its line; totals never exceed shared stock. */
    addItem: (product, quantity = 1, variant = null) =>
      set((state) => {
        const lineId = lineIdOf(product.id, variant);
        const reserved = reservedElsewhere(state.items, product.id, lineId);
        const capacity = product.stock - reserved;
        if (capacity <= 0) return state;
        const existing = state.items.find((i) => i.lineId === lineId);
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.lineId === lineId ? { ...i, snapshot: snapshotOf(product), quantity: Math.min(i.quantity + quantity, capacity) } : i,
            ),
          };
        }
        return {
          items: [
            ...state.items,
            { lineId, productId: product.id, variant, quantity: clampQuantity(quantity, capacity), snapshot: snapshotOf(product) },
          ],
        };
      }),

    setQuantity: (lineId, quantity) =>
      set((state) => {
        const line = state.items.find((i) => i.lineId === lineId);
        if (!line) return state;
        const capacity = Math.max(1, line.snapshot.stock - reservedElsewhere(state.items, line.productId, lineId));
        return { items: state.items.map((i) => (i.lineId === lineId ? { ...i, quantity: clampQuantity(quantity, capacity) } : i)) };
      }),

    removeItem: (lineId) => set((s) => ({ items: s.items.filter((i) => i.lineId !== lineId) })),

    saveForLater: (lineId) =>
      set((s) => {
        const line = s.items.find((i) => i.lineId === lineId);
        if (!line) return s;
        const rest = s.savedForLater.filter((i) => i.lineId !== lineId);
        return { items: s.items.filter((i) => i.lineId !== lineId), savedForLater: [...rest, line] };
      }),

    /** Move a saved line back to the cart, merging into an existing line and respecting stock. */
    moveToCart: (lineId) =>
      set((s) => {
        const saved = s.savedForLater.find((i) => i.lineId === lineId);
        if (!saved) return s;
        const remaining = s.savedForLater.filter((i) => i.lineId !== lineId);
        const reserved = reservedElsewhere(s.items, saved.productId, lineId);
        const capacity = saved.snapshot.stock - reserved;
        if (capacity <= 0) return s; // out of stock: leave it saved
        const existing = s.items.find((i) => i.lineId === lineId);
        const items = existing
          ? s.items.map((i) => (i.lineId === lineId ? { ...i, quantity: Math.min(i.quantity + saved.quantity, capacity) } : i))
          : [...s.items, { ...saved, quantity: Math.min(saved.quantity, capacity) }];
        return { items, savedForLater: remaining };
      }),

    removeSaved: (lineId) => set((s) => ({ savedForLater: s.savedForLater.filter((i) => i.lineId !== lineId) })),

    /** Apply fresh stock from the API: update snapshots and clamp quantities (shared across variants). */
    applyLiveStock: (productId, stock) =>
      set((s) => {
        let remaining = stock;
        const items = s.items.map((i) => {
          if (i.productId !== productId) return i;
          const quantity = stock > 0 ? Math.max(1, Math.min(i.quantity, remaining)) : i.quantity;
          remaining = Math.max(0, remaining - quantity);
          return { ...i, quantity, snapshot: { ...i.snapshot, stock } };
        });
        return { items };
      }),

    /** Customer accepted a new price. */
    acceptPrice: (productId, price) =>
      set((s) => ({
        items: s.items.map((i) => (i.productId === productId ? { ...i, snapshot: { ...i.snapshot, price } } : i)),
      })),

    setCoupon: (code) => set({ couponCode: code }),
    clearCoupon: () => set({ couponCode: null }),
    clear: () => set({ items: [], couponCode: null }),
  }),
  { version: 2, migrate },
);

/** Total number of units in the cart. */
export const selectCartCount = (state) => state.items.reduce((n, i) => n + i.quantity, 0);
/** Units of one product across all its lines/variants. */
export const selectProductQuantity = (productId) => (state) =>
  state.items.filter((i) => i.productId === productId).reduce((n, i) => n + i.quantity, 0);
