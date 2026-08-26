'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import InitializationScreen from '@/components/ui/InitializationScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

// The wallet stack (wagmi → viem, farcaster, radix, tanstack) is ~400 KB raw.
// Ring 0 is wallet-free by design and the day-0 foyer needs none of it, so the
// whole provider tree defers behind the boot splash instead of riding the
// first-load chunks. The loading fallback is the same branded splash already
// showing during hydration, so the swap is invisible.
const SimplifiedAppProviders = dynamic(() => import('./SimplifiedAppProviders'), {
  ssr: false,
  loading: () => <InitializationScreen />,
});

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

  useEffect(() => {
    setIsClient(true);

    // Legacy key: keeps the (currently unmounted) wallet IntroDialog suppressed
    // for anyone who already passed the old boot ceremony.
    try {
      localStorage.setItem('imf_skipWalletIntro', '1');
    } catch {
      // storage blocked — non-fatal
    }

    // Register service worker for caching TF model assets. Keep this off the
    // critical path; it should never compete with the first-visit doorway.
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const register = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (e) {
          console.warn('SW registration failed:', e);
        }
      };
      const timer = setTimeout(register, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Pose/TensorFlow intentionally initialize from the camera-start path. The
  // foyer should be a fast, playful invitation, not a hidden model download.
  if (!isClient) {
    return <InitializationScreen />;
  }

  return (
    <OnboardingProvider>
      <SimplifiedAppProviders>{children}</SimplifiedAppProviders>
    </OnboardingProvider>
  );
}
