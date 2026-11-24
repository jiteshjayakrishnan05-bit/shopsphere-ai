import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

export const CHECKOUT_STEPS = Object.freeze([
  "customer",
  "address",
  "delivery",
  "summary",
  "payment",
  "confirmation",
]);

/** Checkout progress persists so a refresh restores the current step and entered data. */
export const useCheckoutStore = createPersistedStore(STORAGE_KEYS.checkout, (set) => ({
  step: 0,
  data: {},
  setStep: (step) => set({ step: Math.max(0, Math.min(CHECKOUT_STEPS.length - 1, step)) }),
  updateData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  reset: () => set({ step: 0, data: {} }),
}));
