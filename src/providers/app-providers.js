"use client";

import { QueryProvider } from "./query-provider";
import { StoreHydrator } from "./store-hydrator";

export function AppProviders({ children }) {
  return (
    <QueryProvider>
      <StoreHydrator />
      {children}
    </QueryProvider>
  );
}
