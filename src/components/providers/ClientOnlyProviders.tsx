'use client';

import { useState, useEffect } from 'react';
import InitializationScreen from '@/components/ui/InitializationScreen';
import SimplifiedAppProviders from './SimplifiedAppProviders';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

interface ClientOnlyProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper to ensure providers only render on client side
 * This prevents SSR issues with wallet connectors.
 * Chain ambient is owned by the home page after first XP — not here —
 * so day-0 studio atmosphere is never tinted by a wallet chain.
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

  return (
    <OnboardingProvider>
      <SimplifiedAppProviders>{children}</SimplifiedAppProviders>
    </OnboardingProvider>
  );
}
