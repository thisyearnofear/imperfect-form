"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";
import SimplifiedAppProviders from "./SimplifiedAppProviders";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";

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

  // Dynamically import components for client-only rendering
  const Tour = dynamic(() => import("@/components/onboarding/Tour"), { ssr: false });
  const ChainAmbient = dynamic(() => import("@/components/theme/ChainAmbient"), { ssr: false });

  // Render with OnboardingProvider and conditionally show Tour
  function ProvidersWithOnboarding({ children }: { children: React.ReactNode }) {
    const { shouldShowTour } = useOnboarding?.() || { shouldShowTour: false };
    return (
      <SimplifiedAppProviders>
        <ChainAmbient />
        {shouldShowTour && <Tour />}
        {children}
      </SimplifiedAppProviders>
    );
  }

  return (
    <OnboardingProvider>
      <ProvidersWithOnboarding>
        {children}
      </ProvidersWithOnboarding>
    </OnboardingProvider>
  );
}
