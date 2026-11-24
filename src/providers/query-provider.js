"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetry } from "@/services/api/api-client";

/** One QueryClient per browser session; defaults are centralised here. */
export function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // product data is fresh for 5 minutes
            gcTime: 30 * 60 * 1000, // keep cached data 30 minutes for offline fallbacks
            retry: shouldRetry,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
