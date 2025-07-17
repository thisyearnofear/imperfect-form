"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui";
import SimplifiedAppProviders from "./SimplifiedAppProviders";
import { ChainThemeProvider } from "@/contexts/ChainThemeContext";
import ChainAmbient from "@/components/theme/ChainAmbient";

interface ClientOnlyProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper to ensure providers only render on client side
 * This prevents SSR issues with wallet connectors
 */
export default function ClientOnlyProviders({ children }: ClientOnlyProvidersProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading screen during SSR and initial client render
  if (!isClient) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner />
          <p className="text-yellow-400 font-bold animate-pulse">
            Loading Imperfect Form...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChainThemeProvider>
      <ChainAmbient />
      <SimplifiedAppProviders>
        {children}
      </SimplifiedAppProviders>
    </ChainThemeProvider>
  );
}
