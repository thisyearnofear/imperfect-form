'use client';

import React from 'react';
import { BRAND } from '@/lib/brandPositioning';
import '@/styles/studio-boot.css';

/**
 * Passive boot splash, shown only while client providers hydrate.
 *
 * Previously this was an interactive gate: a fake "Preparing" timer followed
 * by a sound-consent choice ("Enter quietly" / "Enter the bay"). That cost
 * every visitor a full extra screen before the foyer, and the choice was
 * meaningless before any sound existed. Hydration is now the only wait.
 *
 * Sound stays on by default (first CTA press is a real user gesture, which
 * unlocks the AudioContext anyway) and remains toggleable in Settings.
 */
export default function InitializationScreen() {
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
          Preparing the bay
        </p>
      </div>
    </div>
  );
}
