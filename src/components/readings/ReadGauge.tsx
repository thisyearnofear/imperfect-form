'use client';

import React from 'react';
import type { ReadLevel } from '@/lib/readQuality';

/**
 * ReadGauge — confidence as furniture (docs/PHASE_B_PLAN §B1). A small
 * semicircular instrument dial: three zones (Early / Usable / Clear) and a
 * brass needle tracking read quality 0..1. SVG first; shader ambient is a
 * later finish pass — never in the camera read path.
 */

export type ReadGaugeProps = {
  needle: number; // 0..1
  level: ReadLevel;
  size?: number;
};

const ZONE_LABELS: Record<ReadLevel, string> = {
  early: 'Early read',
  usable: 'Usable read',
  clear: 'Clear read',
};

export function ReadGauge({ needle, level, size = 96 }: ReadGaugeProps) {
  // Dial geometry: semicircle, radius 40, center (50, 55).
  const angle = -90 + Math.min(1, Math.max(0, needle)) * 180;
  const rad = (angle * Math.PI) / 180;
  const nx = 50 + 36 * Math.cos(rad);
  const ny = 55 + 36 * Math.sin(rad);

  return (
    <svg
      className="read-gauge"
      width={size}
      height={size * 0.62}
      viewBox="0 0 100 62"
      role="img"
      aria-label={`Read quality: ${ZONE_LABELS[level]}`}
    >
      {/* Zone arcs — early (muted), usable (brass-dim), clear (teal). */}
      <path className="read-gauge__zone read-gauge__zone--early" d="M10 55 A40 40 0 0 1 30 20" />
      <path className="read-gauge__zone read-gauge__zone--usable" d="M32 18 A40 40 0 0 1 68 18" />
      <path className="read-gauge__zone read-gauge__zone--clear" d="M70 20 A40 40 0 0 1 90 55" />
      {/* Ticks at zone boundaries. */}
      {[10, 30, 50, 70, 90].map((x, i) => (
        <line
          key={i}
          className="read-gauge__tick"
          x1={x === 50 ? 50 : x < 50 ? x - 2 : x + 2}
          y1={x === 50 ? 14 : 20}
          x2={x}
          y2={x === 50 ? 20 : 26}
        />
      ))}
      {/* Needle — brass instrument hand. */}
      <line className="read-gauge__needle" x1="50" y1="55" x2={nx} y2={ny} />
      <circle className="read-gauge__pivot" cx="50" cy="55" r="3" />
      <text className="read-gauge__label" x="50" y="60" textAnchor="middle">
        {ZONE_LABELS[level]}
      </text>
    </svg>
  );
}

export default ReadGauge;
