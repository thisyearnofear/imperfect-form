'use client';

import { useId } from 'react';
import {
  JP_ARM_PATH_LEN as ARM_PATH_LEN,
  JP_PIVOT as PIVOT,
  JP_R as R,
  JP_TICKS as TICKS,
  clamp01,
  jpArmPath as armPath,
  jpArmPose as armPose,
  jpRound as f,
} from './shoulderAnatomy';
import '@/styles/reach-plate.css';

/**
 * ReachPlate — "Fig 1 · The Reach". A hand-drawn engraved instrument plate:
 * hairline figure (head / shoulders / spine / pelvis, one arm) inside a brass
 * ruled frame with a protractor arc, degree ticks and a pip row at the base.
 *
 * The arm pose is driven by a single `progress` prop (0 = arm hanging,
 * 1 = arm overhead) so the looping hero, tap-scrub and scroll-scrub all drive
 * the same drawing. Ghost poses trail behind the raise (smear — low-opacity
 * duplicate paths, no filters) and a light pulse chases up the arm via
 * stroke-dashoffset.
 */

export type ReachPlateProps = {
  /** 0..1 — 0 arm hanging, 1 arm overhead. */
  progress: number;
  /** Engraved top caption. */
  caption?: string;
  /** Engraved bottom caption. */
  plateNum?: string;
  /** Trailing smear poses (0 disables). */
  ghostCount?: number;
  /** Multiplies ghost opacity — "emphasized" for Beat 1. */
  ghostBoost?: number;
  /** Number of pips along the base edge (0 hides the row). */
  pips?: number;
  /** How many pips read lit. Defaults to floor(progress * pips). */
  litPips?: number;
  /** When true the brass range arc draws proportional to progress (Beat 3
      scrub) instead of sitting as a full faint ideal. */
  drawArc?: boolean;
  /** Mirrored left arm fading in over the last third (Beat 3 balance). */
  mirror?: boolean;
  /** Steadying ring at the shoulder pivot, middle third (Beat 3 control). */
  controlRing?: boolean;
  className?: string;
};

// —— Plate geometry, arm pose and degree ticks live in ./shoulderAnatomy —
// the same constants drive JointPlate's frame, so the reach figure this
// plate draws drops into the JointPlate frame unchanged when the zoom
// register flips to `move`.

/**
 * ReachFigure — the hairline figure itself (torso, ghost trail, working
 * arm, pulse, hand, pivot ring) with no frame chrome. ReachPlate mounts
 * it inside the engraved plate; JointPlate mounts the same drawing when
 * the zoom register flips to `move` — the movement itself, glanceable.
 * Needs the `.rp-*` tokens (reach-plate.css) on an ancestor.
 */
export type ReachFigureProps = {
  /** 0..1 — 0 arm hanging, 1 arm overhead. */
  progress: number;
  /** Trailing smear poses — earlier positions of the same arm, fading back. */
  ghostTrail?: ReadonlyArray<{ offset: number; opacity: number }>;
  /** Multiplies ghost opacity — "emphasized" for Beat 1. */
  ghostBoost?: number;
  /** Mirrored left arm fading in over the last third (Beat 3 balance). */
  mirror?: boolean;
  /** Steadying ring at the shoulder pivot, middle third (Beat 3 control). */
  controlRing?: boolean;
};

export function ReachFigure({
  progress,
  ghostTrail = [],
  ghostBoost = 1,
  mirror = false,
  controlRing = false,
}: ReachFigureProps) {
  const p = clamp01(progress);
  const pose = armPose(p);
  const pulseOffset = 22 - ARM_PATH_LEN * p;
  const ringAlpha = controlRing ? clamp01((p - 0.3) * 3) : 0;
  const mirrorAlpha = mirror ? clamp01((p - 0.64) * 3) : 0;

  return (
    <g className="rp-figure-root">
      {/* The figure — hairline studio teal. */}
      <g className="rp-figure">
        <circle className="rp-bone" cx="160" cy="100" r="14" />
        <line className="rp-bone" x1="160" y1="114" x2="160" y2="124" />
        <path className="rp-bone" d="M124 142 Q160 132 196 142" />
        <line className="rp-bone" x1="160" y1="124" x2="160" y2="212" />
        <path className="rp-bone" d="M130 214 Q160 220 190 214" />
        {/* ribcage suggestion, dim */}
        <path className="rp-bone rp-bone--dim" d="M128 142 C122 170 124 196 132 214" />
        <path className="rp-bone rp-bone--dim" d="M190 142 C196 170 194 196 186 214" />
        {/* resting arm + legs, dimmer still */}
        <path className="rp-bone rp-bone--dim" d="M128 142 L124 180 Q123 196 122 210" />
        <circle className="rp-joint rp-joint--dim" cx="122" cy="211" r="2.4" />
        <path className="rp-bone rp-bone--faint" d="M138 216 L134 268" />
        <path className="rp-bone rp-bone--faint" d="M184 216 L186 268" />
        <line className="rp-ground" x1="104" y1="274" x2="220" y2="274" />
      </g>

      {/* Ghost trail — earlier poses of the same arm, smeared back. */}
      {ghostTrail.map((ghost) =>
        p - ghost.offset > 0.02 ? (
          <path
            key={ghost.offset}
            className="rp-ghost"
            d={armPath(p - ghost.offset)}
            style={{ opacity: ghost.opacity * ghostBoost }}
          />
        ) : null
      )}

      {/* Mirrored arm (Beat 3 — balance fills in over the last third). */}
      {mirror && mirrorAlpha > 0.01 && (
        <path
          className="rp-ghost rp-ghost--mirror"
          d={armPath(p)}
          transform="translate(320 0) scale(-1 1)"
          style={{ opacity: mirrorAlpha * 0.55 }}
        />
      )}

      {/* The working arm. */}
      <path className="rp-arm" d={armPath(p)} />
      {/* Light pulse — one lit dash chasing up the arm each raise. */}
      <path
        className="rp-pulse"
        d={armPath(p)}
        strokeDasharray="22 999"
        strokeDashoffset={pulseOffset}
      />
      <circle
        className="rp-hand"
        cx={f(pose.wx)}
        cy={f(pose.wy)}
        r="3"
        style={{ opacity: 0.45 + p * 0.55 }}
      />
      {/* Control ring steadies at the pivot (Beat 3 — control). */}
      {controlRing && ringAlpha > 0.01 && (
        <circle
          className="rp-control-ring"
          cx={PIVOT.x}
          cy={PIVOT.y}
          r="9"
          style={{ opacity: ringAlpha }}
        />
      )}
      <circle className="rp-pivot" cx={PIVOT.x} cy={PIVOT.y} r="2.6" />
    </g>
  );
}

export function ReachPlate({
  progress,
  caption = '· Fig 1 · The Reach ·',
  plateNum = 'Plate I',
  ghostCount = 3,
  ghostBoost = 1,
  pips = 5,
  litPips,
  drawArc = false,
  mirror = false,
  controlRing = false,
  className = '',
}: ReachPlateProps) {
  const uid = useId().replace(/:/g, '');
  const p = clamp01(progress);
  const lit = litPips ?? Math.min(pips, Math.floor(p * (pips + 0.001)));

  // Ghost poses trail the raise — earlier poses, fading back.
  const GHOST_OFFSETS = [0.09, 0.18, 0.27].slice(0, Math.max(0, ghostCount));
  const GHOST_OPACITY = [0.24, 0.15, 0.08];

  // Beat 3 helpers: the range arc draws, a ring steadies at the pivot,
  // and a mirrored arm fills in over the last third.
  const arcDrawn = drawArc ? Math.min(1, p * 1.04) : 1;

  return (
    <svg
      className={`reach-plate${className ? ` ${className}` : ''}`}
      viewBox="0 0 320 372"
      role="img"
      aria-label="Engraved instrument plate: a figure raising one arm while a pulse travels up it and pips count the raise."
    >
      <defs>
        <pattern
          id={`rp-hatch-${uid}`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" className="rp-hatch-line" />
        </pattern>
        <clipPath id={`rp-clip-${uid}`}>
          <rect x="13" y="13" width="294" height="346" rx="2" />
        </clipPath>
      </defs>

      {/* Faint engraved hatch, clipped inside the inner rule. */}
      <rect
        x="13"
        y="13"
        width="294"
        height="346"
        clipPath={`url(#rp-clip-${uid})`}
        fill={`url(#rp-hatch-${uid})`}
      />

      {/* Plate frame: outer brass rule + inner hairline + corner ticks. */}
      <rect className="rp-frame" x="6" y="6" width="308" height="360" rx="3" />
      <rect className="rp-frame rp-frame--inner" x="12" y="12" width="296" height="348" rx="2" />
      <path className="rp-corner" d="M18 26 V18 H26" />
      <path className="rp-corner" d="M302 26 V18 H294" />
      <path className="rp-corner" d="M18 346 V354 H26" />
      <path className="rp-corner" d="M302 346 V354 H294" />

      {/* Engraved captions. */}
      <text className="rp-caption" x="160" y="33" textAnchor="middle">
        {caption}
      </text>
      <path className="rp-caption-rule" d="M104 42 H216" />
      <text className="rp-plate-num" x="160" y="357" textAnchor="middle">
        {plateNum}
      </text>

      {/* Protractor: faint plumb line, arc, degree ticks + labels. */}
      <line className="rp-plumb" x1={PIVOT.x} y1="48" x2={PIVOT.x} y2="316" />
      <path
        className="rp-arc-ideal"
        d={`M${PIVOT.x} ${PIVOT.y + R} A${R} ${R} 0 0 0 ${PIVOT.x} ${PIVOT.y - R}`}
        pathLength={1}
        strokeDasharray="2.5 5"
      />
      <path
        className="rp-arc-drawn"
        d={`M${PIVOT.x} ${PIVOT.y + R} A${R} ${R} 0 0 0 ${PIVOT.x} ${PIVOT.y - R}`}
        pathLength={1}
        strokeDasharray={`${arcDrawn} 1`}
        style={{ opacity: drawArc ? 0.85 : 0.22 }}
      />
      {TICKS.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const major = deg % 90 === 0;
        const r1 = R + 4;
        const r2 = R + (major ? 11 : 8);
        return (
          <line
            key={deg}
            className={`rp-deg-tick${major ? ' rp-deg-tick--major' : ''}`}
            x1={PIVOT.x + r1 * Math.sin(a)}
            y1={PIVOT.y + r1 * Math.cos(a)}
            x2={PIVOT.x + r2 * Math.sin(a)}
            y2={PIVOT.y + r2 * Math.cos(a)}
          />
        );
      })}
      <text className="rp-deg-label" x="207" y="252">
        0°
      </text>
      <text className="rp-deg-label" x="301" y="146" textAnchor="end">
        90°
      </text>
      <text className="rp-deg-label" x="208" y="58">
        180°
      </text>

      {/* The figure — hairline studio teal (./ReachFigure, shared with
          JointPlate's `move` register). */}
      <ReachFigure
        progress={p}
        ghostTrail={GHOST_OFFSETS.map((off, i) => ({
          offset: off,
          opacity: GHOST_OPACITY[i],
        }))}
        ghostBoost={ghostBoost}
        mirror={mirror}
        controlRing={controlRing}
      />

      {/* Engraved footnote. */}
      <text className="rp-footnote" x="20" y="298">
        — measured at the shoulder
      </text>

      {/* Base-edge pips: one marks each raise. */}
      {pips > 0 && (
        <g className="rp-pips">
          {Array.from({ length: pips }, (_, i) => (
            <circle
              key={i}
              className={`rp-pip${i < lit ? ' is-lit' : ''}`}
              cx={160 + (i - (pips - 1) / 2) * 18}
              cy="330"
              r="2.6"
            />
          ))}
        </g>
      )}
    </svg>
  );
}

export default ReachPlate;
