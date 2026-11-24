"use client";

import { useEffect } from "react";
import { persistedStores } from "@/store";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * Rehydrates all persisted Zustand stores after mount (SSR-safe) and keeps them in
 * sync across browser tabs via the `storage` event.
 */
export function StoreHydrator() {
  useEffect(() => {
    persistedStores.forEach((store) => store.persist.rehydrate());

    const keys = new Set(Object.values(STORAGE_KEYS));
    const onStorage = (event) => {
      if (event.key && keys.has(event.key)) {
        persistedStores.forEach((store) => {
          if (store.persist.getOptions().name === event.key) store.persist.rehydrate();
        });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
