'use client';

import React, { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brandPositioning';
import { playStudioCue, setUiSoundPreferred } from '@/lib/uiSound';
import '@/styles/studio-boot.css';

interface InitializationScreenProps {
  onComplete: () => void;
  platform?: string;
}

type BootPhase = 'preparing' | 'ready';

/**
 * First paint before client providers hydrate.
 * Soft Enter-the-bay ceremony (Weisdevice-lite): sound consent without Press Start.
 * Automation / returning session skip the gate so Ring 0 stays fast.
 */
export default function InitializationScreen({
  onComplete,
}: Omit<InitializationScreenProps, 'platform'>) {
  const [phase, setPhase] = useState<BootPhase>('preparing');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('imf_seenOnboarding_v1', '1');
    localStorage.setItem('imf_skipWalletIntro', '1');

    const skipCeremony =
      navigator.webdriver === true ||
      sessionStorage.getItem('imf_bayEntered') === '1' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (skipCeremony) {
      const timer = setTimeout(onComplete, 280);
      return () => clearTimeout(timer);
    }

    const readyTimer = setTimeout(() => setPhase('ready'), 420);
    // Fail-open: never block the doorway if the user doesn't click
    const autoTimer = setTimeout(() => {
      sessionStorage.setItem('imf_bayEntered', '1');
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(readyTimer);
      clearTimeout(autoTimer);
    };
  }, [onComplete]);

  const enter = (withSound: boolean) => {
    sessionStorage.setItem('imf_bayEntered', '1');
    if (withSound) {
      setUiSoundPreferred(true);
      playStudioCue('chime');
    } else {
      setUiSoundPreferred(false);
    }
    onComplete();
  };

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

        {phase === 'preparing' ? (
          <p className="studio-boot__status">
            <span className="studio-boot__signal" aria-hidden="true" />
            Preparing camera coaching
          </p>
        ) : (
          <div className="studio-boot__enter">
            <p className="studio-boot__status">
              <span className="studio-boot__signal" aria-hidden="true" />
              Bay ready
            </p>
            <div className="studio-boot__actions">
              <button
                type="button"
                className="studio-boot__btn studio-boot__btn--quiet"
                onClick={() => enter(false)}
              >
                Enter quietly
              </button>
              <button
                type="button"
                className="studio-boot__btn studio-boot__btn--primary"
                onClick={() => enter(true)}
                autoFocus
              >
                Enter the bay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
