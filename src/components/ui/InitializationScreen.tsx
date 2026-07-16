'use client';

import React, { useEffect } from 'react';
import { BRAND } from '@/lib/brandPositioning';
import '@/styles/studio-boot.css';

interface InitializationScreenProps {
  onComplete: () => void;
  platform?: string;
}

/**
 * First paint before client providers hydrate.
 * Must match day-0 studio doorway — not arcade Press Start / gold / emoji.
 */
export default function InitializationScreen({
  onComplete,
}: Omit<InitializationScreenProps, 'platform'>) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
    }

    // Brief hold so wallet providers can mount without a layout jump.
    const timer = setTimeout(onComplete, 280);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="studio-boot"
      role="status"
      aria-live="polite"
      aria-label="Loading Imperfect Form"
    >
      <div className="studio-boot__atmosphere" aria-hidden="true">
        <div className="studio-boot__glow" />
      </div>
      <div className="studio-boot__content">
        <p className="studio-boot__brand">{BRAND.studio.brand}</p>
        <p className="studio-boot__line">{BRAND.studio.line1}</p>
        <p className="studio-boot__status">
          <span className="studio-boot__signal" aria-hidden="true" />
          Preparing camera coaching
        </p>
      </div>
    </div>
  );
}
