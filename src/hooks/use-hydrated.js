"use client";

import { useEffect, useState } from "react";

/**
 * True once persisted stores have been rehydrated on the client.
 * Use it to avoid rendering localStorage-derived UI (cart count, wishlist hearts)
 * during the first render, which prevents hydration mismatches.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
