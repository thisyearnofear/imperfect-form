"use client";

import React, { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * ThirdwebQueryProvider component
 * 
 * This component provides a dedicated QueryClientProvider for ThirdWeb components.
 * It creates a new QueryClient instance and wraps its children with QueryClientProvider.
 * 
 * This is necessary because ThirdWeb components need to access the QueryClient from
 * the same React context tree where they're rendered.
 */
export default function ThirdwebQueryProvider({ children }: { children: ReactNode }) {
  // Create a new QueryClient instance for ThirdWeb components
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries to prevent excessive requests
        retry: false,
        // Disable refetching on window focus to prevent unnecessary requests
        refetchOnWindowFocus: false,
        // Disable refetching on reconnect to prevent unnecessary requests
        refetchOnReconnect: false,
        // Disable stale time to prevent unnecessary requests
        staleTime: Infinity,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
