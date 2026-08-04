'use client';

import React from 'react';
import { Camera, LockKeyhole, ArrowRight } from 'lucide-react';
import { BRAND } from '@/lib/brandPositioning';
import '@/styles/crafft-cabinet.css';

/**
 * The Sandow Machine — Cræft / Sandow cabinet exhibit surface.
 *
 * A Victorian seaside strength-tester cabinet housing the form-coaching loop:
 * photo in → graded against Sandow 1897 → arm shows the fix. This is the
 * exhibit identity for the Cræft Prize submission (see docs/CRAFFT_PRIZE.md),
 * not the day-0 web door (which stays studio/trust-first).
 *
 * Satire with a steel core: playful brass-plate cabinet aesthetic over the
 * real working instrument (on-device pose + SO-101 arm).
 */
export interface CrafftCabinetProps {
  /** Reps graded (post-session). Omit for the idle cabinet state. */
  reps?: number;
  /** Mode being graded. */
  mode?: string;
  /** Whether the arm is demonstrating (live station linked). */
  armLinked?: boolean;
  /** Start the grading — insert coin. */
  onBegin?: () => void;
}

export function CrafftCabinet({
  reps,
  mode = 'curls',
  armLinked = false,
  onBegin,
}: CrafftCabinetProps) {
  const foyer = BRAND.crafft;
  const graded = typeof reps === 'number' && reps >= 0;

  return (
    <section
      className="crafft-cabinet"
      aria-labelledby="crafft-cabinet-title"
      data-register="crafft"
    >
      <div className="crafft-cabinet__inner">
        {/* Brass nameplate */}
        <div className="crafft-nameplate motion-enter">
          <p className="crafft-nameplate__brand">{foyer.brand}</p>
          <p className="crafft-nameplate__sub">{foyer.line1}</p>
        </div>

        <h2 id="crafft-cabinet-title" className="crafft-cabinet__lede motion-enter motion-delay-1">
          {foyer.line2}
        </h2>

        {/* The grading gauge — idle or graded */}
        <div className="crafft-gauge motion-enter motion-delay-2">
          <span className="crafft-gauge__label">
            {graded ? `GRADED · ${mode.toUpperCase()}` : 'AWAITING SUBJECT'}
          </span>
          <span className="crafft-gauge__value">{graded ? `${reps} reps` : '— —'}</span>
        </div>

        {/* Royal warrant stamp — the lineage */}
        <div className="crafft-warrant motion-enter motion-delay-2">Graded vs. Sandow 1897</div>

        {/* INSERT COIN — the begin CTA */}
        {!graded && (
          <button
            type="button"
            className="crafft-cta motion-enter motion-delay-3"
            onClick={onBegin}
            aria-label={foyer.cta}
          >
            <Camera size={16} strokeWidth={2} />
            {foyer.cta}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        )}

        {/* Trust line — on-device, no slop */}
        <p className="crafft-cabinet__trust motion-enter motion-delay-3">
          <LockKeyhole size={13} strokeWidth={2} aria-hidden="true" />
          {foyer.trust}
        </p>

        {/* Arm status — fail-silent, like the real station */}
        {armLinked && (
          <p className="crafft-cabinet__arm-status motion-enter motion-delay-4">
            <span className="crafft-cabinet__arm-dot" aria-hidden="true" /> SO-101 linked · ready to
            demonstrate
          </p>
        )}

        {/* Sandow lineage footer — the historical anchor */}
        <p className="crafft-lineage motion-enter motion-delay-4">
          <strong>1897:</strong> Eugen Sandow graded photographs by post. <strong>2026:</strong> we
          closed the loop with a robot arm. Britain invented the form-check — we finished it.
        </p>
      </div>
    </section>
  );
}

export default CrafftCabinet;
