'use client';

import React from 'react';
import { BRAND } from '@/lib/brandPositioning';
import { useImmersive } from '@/hooks/useImmersive';
import '@/styles/studio-boot.css';

/**
 * Passive boot splash, shown only while client providers hydrate.
 *
 * Default: neutral ("Preparing the bay"). Immersive mode: "Calibrating the
 * gauge" — the Sandow lineage thread. The toggle is opt-in (default off) so
 * the verbose heritage stays discoverable, not relentless.
 */
export default function InitializationScreen() {
  const { immersive } = useImmersive();
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
          {immersive ? 'Calibrating the gauge' : 'Preparing the bay'}
        </p>
      </div>
    </div>
  );
}
