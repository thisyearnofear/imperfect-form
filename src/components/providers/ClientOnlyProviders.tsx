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
          await navigator.serviceWorker.register('/sw.js');
        } catch (e) {
          console.warn('SW registration failed:', e);
        }
      };
      // Delay registration slightly to avoid competing with critical loads
      setTimeout(register, 1500);
    }

    // Pre-warm TensorFlow.js backend and pre-download the MoveNet model so the
    // first workout starts faster. Runs in a non-blocking idle window.
    const warmup = async () => {
      try {
        const [{ initializeTensorFlow }, poseDetection] = await Promise.all([
          import('@/utils/tensorFlowInit'),
          import('@tensorflow-models/pose-detection'),
        ]);

        await initializeTensorFlow({ preferWebGL: true });

        const isMobileUA =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
            navigator.userAgent
          );
        const modelType = isMobileUA ? 'SinglePose.Lightning' : 'SinglePose.Thunder';

        const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
          modelType: modelType as any,
          enableSmoothing: true,
        });

        // Warm up with a dummy inference so the first real frame is faster.
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, 256, 256);
          await detector.estimatePoses(canvas);
        }

        // Expose for the workout pipeline to reuse the pre-warmed detector.
        window.__imfPreWarmedDetector = detector;
      } catch (e) {
        console.warn('TF.js pre-warm failed:', e);
      }
    };

    if (typeof window !== 'undefined') {
      const delay = 'requestIdleCallback' in window ? 500 : 1500;
      const run = () => {
        // Use requestIdleCallback when available to avoid competing with render.
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => warmup());
        } else {
          setTimeout(warmup, 0);
        }
      };
      const timer = setTimeout(run, delay);
      return () => clearTimeout(timer);
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
