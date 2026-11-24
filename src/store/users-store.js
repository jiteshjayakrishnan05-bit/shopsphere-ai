import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";

/** Locally registered accounts (mock user database). Passwords are stored only as hashes. */
export const useUsersStore = createPersistedStore(STORAGE_KEYS.users, (set) => ({
  /** @type {{id: string, name: string, email: string, phone: string, role: "customer", passwordHash: string}[]} */
  users: [],
  addUser: (user) => set((s) => ({ users: [...s.users, user] })),
}));
