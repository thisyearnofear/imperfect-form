'use client';

import React from 'react';
import { BRAND } from '@/lib/brandPositioning';
import '@/styles/prestart-foyer.css';

/**
 * Day-0 pre-start composition — one job: brand + vision + trust + hint.
 * Crafted play via staggered reveal; no emoji feature dump, no slogans.
 * START lives in GameControls (Ring 0).
 */
export const PreStartFoyer: React.FC = () => {
  return (
    <div id="instructions" className="prestart-foyer" aria-label={`${BRAND.name} welcome`}>
      <p className="prestart-foyer__brand prestart-foyer__reveal" style={{ animationDelay: '0ms' }}>
        {BRAND.name}
      </p>
      <p
        className="prestart-foyer__vision prestart-foyer__reveal"
        style={{ animationDelay: '120ms' }}
      >
        {BRAND.visionLine}
      </p>
      <p
        className="prestart-foyer__trust prestart-foyer__reveal"
        style={{ animationDelay: '240ms' }}
      >
        {BRAND.trustLine}
      </p>
      <p
        className="prestart-foyer__hint prestart-foyer__reveal"
        style={{ animationDelay: '360ms' }}
      >
        {BRAND.roboticsHint}
      </p>
      <p
        className="prestart-foyer__cta-hint prestart-foyer__reveal"
        style={{ animationDelay: '480ms' }}
      >
        Choose a movement below, then Start.
      </p>
    </div>
  );
};

export default PreStartFoyer;
