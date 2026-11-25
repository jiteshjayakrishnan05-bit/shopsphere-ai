import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * @typedef {{id: string, userId: string, label: string, address: string, city: string, state: string,
 *   pincode: string, country: string, isDefault: boolean}} SavedAddress
 */

export const useAddressesStore = createPersistedStore(STORAGE_KEYS.addresses, (set) => ({
  /** @type {SavedAddress[]} */
  addresses: [],
  /** Add an address for a user. The user's first address becomes the default. */
  add: (userId, fields) => {
    const id = `addr_${crypto.randomUUID()}`;
    set((s) => {
      const mine = s.addresses.filter((a) => a.userId === userId);
      const isDefault = fields.isDefault || mine.length === 0;
      const others = s.addresses.map((a) => (isDefault && a.userId === userId ? { ...a, isDefault: false } : a));
      return { addresses: [...others, { ...fields, id, userId, isDefault }] };
    });
    return id;
  },
  update: (id, fields) =>
    set((s) => {
      const target = s.addresses.find((a) => a.id === id);
      if (!target) return s;
      return {
        addresses: s.addresses.map((a) => {
          if (a.id === id) return { ...a, ...fields };
          return fields.isDefault && a.userId === target.userId ? { ...a, isDefault: false } : a;
        }),
      };
    }),
  /** Delete an address; if it was the default, the next one (if any) becomes the default. */
  remove: (id) =>
    set((s) => {
      const target = s.addresses.find((a) => a.id === id);
      if (!target) return s;
      let rest = s.addresses.filter((a) => a.id !== id);
      if (target.isDefault) {
        const next = rest.find((a) => a.userId === target.userId);
        if (next) rest = rest.map((a) => (a.id === next.id ? { ...a, isDefault: true } : a));
      }
      return { addresses: rest };
    }),
  setDefault: (id) =>
    set((s) => {
      const target = s.addresses.find((a) => a.id === id);
      if (!target) return s;
      return { addresses: s.addresses.map((a) => (a.userId === target.userId ? { ...a, isDefault: a.id === id } : a)) };
    }),
}));

export const addressesForUser = (addresses, userId) => addresses.filter((a) => a.userId === String(userId));
