'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import InitializationScreen from '@/components/ui/InitializationScreen';
import SimplifiedAppProviders from './SimplifiedAppProviders';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';

interface ClientOnlyProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper to ensure providers only render on client side
 * This prevents SSR issues with wallet connectors
 */
export default function ClientOnlyProviders({ children }: ClientOnlyProvidersProps) {
  const [isClient, setIsClient] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Register service worker for caching TF model assets
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const register = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          if (process.env.NODE_ENV === 'development') {
            console.log('SW registered:', reg.scope);
          }
        } catch (e) {
          console.warn('SW registration failed:', e);
        }
      };
      // Delay registration slightly to avoid competing with critical loads
      setTimeout(register, 1500);
    }
  }, []);

  // Show welcome screen during initialization
  if (!isClient || !initializationComplete) {
    return <InitializationScreen onComplete={() => setInitializationComplete(true)} />;
  }

  // Dynamically import components for client-only rendering
  const Tour = dynamic(() => import('@/components/onboarding/Tour'), {
    ssr: false,
  });
  const ChainAmbient = dynamic(() => import('@/components/theme/ChainAmbient'), { ssr: false });

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
      <ProvidersWithOnboarding>{children}</ProvidersWithOnboarding>
    </OnboardingProvider>
  );
}
