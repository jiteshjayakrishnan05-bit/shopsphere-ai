import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * @typedef {Object} Session
 * @property {string} token       opaque, token-like value (mock; swap for a real provider later)
 * @property {number} expiresAt   epoch ms
 * @property {{id: number|string, name: string, email: string, role: "customer"|"admin"}} user
 */

export const useAuthStore = createPersistedStore(STORAGE_KEYS.auth, (set, get) => ({
  /** @type {Session|null} */
  session: null,
  setSession: (session) => set({ session }),
  logout: () => set({ session: null }),
  isAuthenticated: () => {
    const s = get().session;
    return Boolean(s && s.expiresAt > Date.now());
  },
}));
