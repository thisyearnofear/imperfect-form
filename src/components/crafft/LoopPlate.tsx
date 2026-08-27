'use client';

import React from 'react';

/**
 * The Loop — a dual-column instrument plate (1897 vs 2026).
 *
 * The clearest articulation of the ingenuity: the same feedback loop, 130 years
 * apart, laid out like an engraved measurement plate. Used on /lore in both the
 * minimal (default) and immersive views so the first impression carries the
 * whole argument — shown, not argued. See docs/CRAFFT_PRIZE.md.
 */
const STEPS_1897 = [
  {
    name: 'Photo in',
    detail: 'Men across Britain photographed themselves and mailed the prints to Sandow’s London office.',
  },
  {
    name: 'Graded',
    detail: 'Proportions measured against his “ideal” measurement tables, by hand.',
  },
  {
    name: 'Correction out',
    detail: 'Prescribed corrective exercises, returned on paper.',
  },
  {
    name: 'Physical fix',
    detail: 'The spring-grip dumbbell — a mechanical form-corrector under Royal Warrant.',
  },
] as const;

const STEPS_2026 = [
  {
    name: 'Camera in',
    detail: 'Pose estimation runs in the browser. No video leaves the device.',
  },
  {
    name: 'Graded',
    detail: 'Joint angles read against target ranges, in real time.',
  },
  {
    name: 'Correction out',
    detail: 'An AI coach cues the rep aloud; the on-screen HUD shows the gap.',
  },
  {
    name: 'Physical fix',
    detail: 'The SO-101 arm demonstrates the correct movement — motor learning a screen can’t give.',
  },
] as const;

export function LoopPlate() {
  return (
    <div className="crafft-exhibit__loop-plate">
      <div className="crafft-exhibit__loop-col">
        <span className="crafft-exhibit__loop-eyebrow">1897 · SANDOW</span>
        <ul className="crafft-exhibit__loop-steps">
          {STEPS_1897.map((s) => (
            <li key={s.name} className="crafft-exhibit__loop-step">
              <span className="crafft-exhibit__loop-step-name">{s.name}</span>
              <span className="crafft-exhibit__loop-step-detail">{s.detail}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="crafft-exhibit__loop-col">
        <span className="crafft-exhibit__loop-eyebrow">2026 · IMPERFECT FORM</span>
        <ul className="crafft-exhibit__loop-steps">
          {STEPS_2026.map((s) => (
            <li key={s.name} className="crafft-exhibit__loop-step">
              <span className="crafft-exhibit__loop-step-name">{s.name}</span>
              <span className="crafft-exhibit__loop-step-detail">{s.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default LoopPlate;
