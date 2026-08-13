'use client';

import React from 'react';
import {
  buildRangeArc,
  clampElbowDeg,
  DIAL_TICKS,
  elbowDegToForearmRotation,
} from '@/lib/armSchematic';

type ArmSchematicProps = {
  currentDeg?: number;
  targetDeg?: number;
  /** Sweep origin — the range arc draws from here toward current. */
  fromDeg?: number;
  trail?: number[];
  /** Full dial + ghost target. Compact is the idle silhouette. */
  schematic?: boolean;
  className?: string;
  markerId?: string;
};

/**
 * Shared elbow instrument. Peek and the see→show moment must draw the same
 * limb so the gap between YOU and COACH is the only thing that changes.
 */
export function ArmSchematic({
  currentDeg,
  targetDeg,
  fromDeg,
  trail = [],
  schematic = true,
  className,
  markerId = 'arm-schematic-arrow',
}: ArmSchematicProps) {
  const currentForearmRotation =
    currentDeg !== undefined ? elbowDegToForearmRotation(currentDeg) : undefined;
  const targetForearmRotation =
    targetDeg !== undefined ? elbowDegToForearmRotation(targetDeg) : undefined;
  const showGhost = schematic && targetForearmRotation !== undefined;
  const arcFrom = fromDeg ?? targetDeg;
  const rangeArc =
    showGhost && arcFrom !== undefined && currentDeg !== undefined
      ? buildRangeArc(arcFrom, clampElbowDeg(currentDeg))
      : null;

  if (!schematic) {
    return (
      <svg className={className ?? 'coach-twin-peek__arm'} viewBox="0 0 52 52" fill="none">
        <circle cx="18" cy="38" r="5" stroke="currentColor" strokeWidth="2" opacity="0.55" />
        <path
          d="M18 33 V16"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <g
          className="coach-twin-peek__forearm"
          style={
            currentForearmRotation === undefined
              ? undefined
              : { transform: `rotate(${currentForearmRotation}deg)` }
          }
        >
          <path d="M18 28 H38" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="38" cy="28" r="3.2" fill="currentColor" opacity="0.9" />
        </g>
        <circle cx="18" cy="28" r="3.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      className={className ?? 'coach-twin-peek__arm coach-twin-peek__arm--schematic'}
      viewBox="0 0 60 64"
      fill="none"
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
        </marker>
      </defs>

      {DIAL_TICKS.map((tick) => (
        <line
          key={tick.deg}
          x1={tick.x1.toFixed(2)}
          y1={tick.y1.toFixed(2)}
          x2={tick.x2.toFixed(2)}
          y2={tick.y2.toFixed(2)}
          stroke="currentColor"
          strokeWidth={tick.major ? 1.4 : 0.8}
          opacity={tick.major ? 0.5 : 0.28}
          strokeLinecap="round"
        />
      ))}

      {rangeArc != null ? (
        <path
          className="coach-twin-peek__range-arc"
          d={rangeArc}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray="3 5"
          strokeLinecap="round"
          opacity="0.45"
          markerEnd={`url(#${markerId})`}
        />
      ) : null}

      {trail.slice(0, -1).map((deg, index) => (
        <path
          key={`trail-${index}-${deg.toFixed(1)}`}
          className="coach-twin-peek__trail"
          d="M18 44 H40"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity={0.06 + (index / Math.max(1, trail.length)) * 0.16}
          style={{ transform: `rotate(${elbowDegToForearmRotation(deg)}deg)` }}
        />
      ))}

      <circle cx="18" cy="52" r="4.6" stroke="currentColor" strokeWidth="1.8" opacity="0.5" />
      <path
        d="M18 48 V44"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.85"
      />

      {showGhost && targetForearmRotation !== undefined ? (
        <g
          className="coach-twin-peek__ghost-forearm"
          style={{ transform: `rotate(${targetForearmRotation}deg)` }}
        >
          <path
            d="M18 44 H40"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="2 4"
            opacity="0.3"
          />
          <circle
            cx="40"
            cy="44"
            r="3"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
            opacity="0.55"
          />
        </g>
      ) : null}

      <g
        className="coach-twin-peek__forearm"
        style={
          currentForearmRotation === undefined
            ? undefined
            : { transform: `rotate(${currentForearmRotation}deg)` }
        }
      >
        <path d="M18 44 H40" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="40" cy="44" r="3.2" fill="currentColor" opacity="0.9" />
      </g>
      <circle cx="18" cy="44" r="3.5" fill="currentColor" />
    </svg>
  );
}

export default ArmSchematic;
