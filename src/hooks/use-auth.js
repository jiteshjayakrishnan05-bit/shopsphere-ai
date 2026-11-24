"use client";

import { useCallback } from "react";
import { useAuthStore, useUsersStore } from "@/store";
import { useHydrated } from "./use-hydrated";
import { authenticate, registerUser } from "@/services/api/auth-api";

/** Auth facade over the persisted session store. `isAuthenticated` is false until hydration finishes. */
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.logout);
  const hydrated = useHydrated();

  const isAuthenticated = hydrated && Boolean(session) && session.expiresAt > Date.now();
  const user = isAuthenticated ? session.user : null;

  const login = useCallback(
    async (email, password) => {
      const next = await authenticate(email, password, useUsersStore.getState().users);
      setSession(next);
      return next;
    },
    [setSession],
  );

  const register = useCallback(
    async (input) => {
      const { record, session: next } = await registerUser(input, useUsersStore.getState().users);
      useUsersStore.getState().addUser(record);
      setSession(next);
      return next;
    },
    [setSession],
  );

  return { hydrated, isAuthenticated, user, isAdmin: user?.role === "admin", login, register, logout: clearSession };
}
