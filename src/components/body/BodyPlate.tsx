'use client';

import React from 'react';
import type { NiggleJointId } from '@/lib/niggleIntents';

/**
 * BodyPlate — the anatomical instrument figure (docs/PHASE_B_PLAN §B4).
 * A Victorian anatomical-plate human figure in line engraving: thin strokes,
 * dashed measurement hairlines, brass annotations on the selected zone.
 * Tappable joint zones mirror the intake chips — the figure is progressive
 * enhancement, never the only path.
 */

type ZoneShape = { cx: number; cy: number; rx: number; ry: number };

/** Ellipse hit-areas over the figure, in viewBox coords (0 0 200 400). */
const ZONE_SHAPES: Record<Exclude<NiggleJointId, 'not-sure'>, ZoneShape> = {
  'neck-shoulders': { cx: 100, cy: 96, rx: 44, ry: 30 },
  back: { cx: 100, cy: 168, rx: 34, ry: 42 },
  arm: { cx: 152, cy: 180, rx: 22, ry: 62 },
  knee: { cx: 100, cy: 296, rx: 40, ry: 26 },
};

/** Brass hairline tick positions per zone (y in viewBox coords). */
const ZONE_TICKS: Record<Exclude<NiggleJointId, 'not-sure'>, number> = {
  'neck-shoulders': 96,
  back: 168,
  arm: 180,
  knee: 296,
};

export type BodyPlateProps = {
  selected: NiggleJointId | null;
  onSelect: (joint: NiggleJointId) => void;
  /** When set, the whole figure lights up (e.g. 'not-sure'). */
  annotateAll?: boolean;
};

export function BodyPlate({ selected, onSelect, annotateAll = false }: BodyPlateProps) {
  const isLit = (id: NiggleJointId) => selected === id || (annotateAll && selected === 'not-sure');

  return (
    <svg
      className="body-plate"
      viewBox="0 0 200 400"
      role="group"
      aria-label="Pick where it nags on the figure"
    >
      {/* Measurement hairlines — the instrument plate register. */}
      <g className="body-plate__hairlines" aria-hidden="true">
        {[64, 128, 192, 256, 320].map((y) => (
          <line key={y} x1="10" y1={y} x2="190" y2={y} />
        ))}
      </g>

      {/* The figure — filled silhouette with engraved inner lines. */}
      <g
        className="body-plate__figure"
        data-lit={annotateAll && selected === 'not-sure' ? 'true' : undefined}
        aria-hidden="true"
      >
        <path
          className="body-plate__silhouette"
          d="M100 36 c-12 0 -20 9 -20 21 c0 8 3 14 8 18 l-2 7 c-22 4 -34 14 -36 34 l-6 96 c-1 9 4 15 11 15 c6 0 10 -4 11 -12 l7 -76 4 0 0 84 -20 122 c-2 10 4 17 12 17 c7 0 12 -5 14 -13 l17 -102 0 0 17 102 c2 8 7 13 14 13 c8 0 14 -7 12 -17 l-20 -122 0 -84 4 0 7 76 c1 8 5 12 11 12 c7 0 12 -6 11 -15 l-6 -96 c-2 -20 -14 -30 -36 -34 l-2 -7 c5 -4 8 -10 8 -18 c0 -12 -8 -21 -20 -21 z"
        />
        {/* Engraving detail — center spine + joint dots. */}
        <line className="body-plate__spine" x1="100" y1="82" x2="100" y2="252" />
        {[
          [100, 96],
          [66, 116],
          [134, 116],
          [100, 168],
          [82, 296],
          [118, 296],
          [152, 152],
          [152, 210],
        ].map(([x, y], i) => (
          <circle key={i} className="body-plate__joint-dot" cx={x} cy={y} r="2.5" />
        ))}
      </g>

      {/* Zone highlights + brass measurement ticks on selection. */}
      {(Object.keys(ZONE_SHAPES) as Exclude<NiggleJointId, 'not-sure'>[]).map((id) => {
        const z = ZONE_SHAPES[id];
        const lit = isLit(id);
        return (
          <g key={id} data-zone={id} data-lit={lit ? 'true' : undefined}>
            {lit && (
              <>
                <ellipse
                  className="body-plate__zone-glow"
                  cx={z.cx}
                  cy={z.cy}
                  rx={z.rx}
                  ry={z.ry}
                />
                <line
                  className="body-plate__zone-tick"
                  x1={z.cx + z.rx + 6}
                  y1={ZONE_TICKS[id]}
                  x2="192"
                  y2={ZONE_TICKS[id]}
                />
              </>
            )}
            <ellipse
              className="body-plate__hitarea"
              cx={z.cx}
              cy={z.cy}
              rx={z.rx}
              ry={z.ry}
              role="button"
              tabIndex={0}
              aria-label={`${id === 'neck-shoulders' ? 'My neck and shoulders' : id === 'arm' ? 'My arm or elbow' : id === 'back' ? 'My lower back' : 'My knee'} — tap to pick`}
              aria-pressed={lit}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(id);
                }
              }}
            />
          </g>
        );
      })}

      {/* Whole-figure hit for "not sure — just check me". */}
      <rect
        className="body-plate__hitarea body-plate__hitarea--all"
        x="34"
        y="30"
        width="132"
        height="340"
        role="button"
        tabIndex={0}
        aria-label="Not sure — just check me"
        aria-pressed={selected === 'not-sure'}
        onClick={() => onSelect('not-sure')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect('not-sure');
          }
        }}
      />
    </svg>
  );
}

export default BodyPlate;
