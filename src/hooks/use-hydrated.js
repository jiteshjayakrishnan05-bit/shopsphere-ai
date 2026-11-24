"use client";

import { useEffect, useState } from "react";
import { persistedStores } from "@/store";

const allHydrated = () => persistedStores.every((s) => s.persist.hasHydrated());

/**
 * True once every persisted store has been rehydrated from localStorage on the client.
 * Use it before rendering localStorage-derived UI (cart count, session) so the first
 * client render matches the server HTML (no hydration mismatch).
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const update = () => setHydrated(allHydrated());
    update();
    const unsubscribers = persistedStores.map((s) => s.persist.onFinishHydration(update));
    return () => unsubscribers.forEach((off) => off());
  }, []);
  return hydrated;
}
