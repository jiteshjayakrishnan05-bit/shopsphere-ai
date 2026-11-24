"use client";

import { useEffect, useState } from "react";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

/** Returns `value` after it has stopped changing for `delay` ms. */
export function useDebounce(value, delay = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
