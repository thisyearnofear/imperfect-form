'use client';

/**
 * JointFigure — the shoulder teardown's figure+regions+arm as a reusable
 * SVG group (no own <svg>: callers pick the crop). JointPlate mounts it
 * inside the full engraved frame with peel wiring; the reach FramingGhost
 * mounts it as the session's viewfinder; LiveJointInset mounts it as the
 * in-read "muscle talking" readout.
 *
 * All three share `jointSeq`'s thresholds via `progress`, so a region
 * lighting brass means the same raise on every surface. The drawing
 * carries no animation of its own — prop-driven, reduced-motion safe.
 *
 * Requires the `.jp-*`/`.rp-*` stylesheets (receiving-foyer.css +
 * reach-plate.css) and a `.jp-anatomy` ancestor (or the class on the host
 * <svg>) for the brass/paper/teal tokens.
 */

import type { KeyboardEventHandler, PointerEventHandler } from 'react';
import {
  JP_ARM_PATH_LEN,
  JP_CLAVICLE,
  JP_DELTOID,
  JP_LEVATOR,
  JP_PIVOT,
  JP_SCAP_PIVOT,
  JP_SCAPULA,
  JP_TRAPEZIUS,
  clamp01,
  jpArmPath,
  jpArmPose,
  jpRound,
  jpScapAngle,
  jointSeq,
} from './shoulderAnatomy';

export type JointRegionId = 'trapezius' | 'scapula' | 'arm';

/** Peel wiring the owning plate can supply per region (JointPlate only). */
export type JointRegionProps = {
  role?: 'button';
  tabIndex?: number;
  onPointerDown?: PointerEventHandler<SVGGElement>;
  onPointerUp?: PointerEventHandler<SVGGElement>;
  onKeyDown?: KeyboardEventHandler<SVGGElement>;
};

export type JointFigureProps = {
  /** 0..1 — 0 arm hanging, 1 arm overhead (same contract as the plates). */
  progress: number;
  /** Per-region peel handlers; omit for static/live-mini surfaces. */
  regionProps?: (id: JointRegionId) => JointRegionProps;
  /** Currently peeled part (JointPlate); lights that region peeled-brass. */
  peeled?: JointRegionId | null;
  /** Trailing smear poses — earlier positions of the same arm, fading back. */
  ghostTrail?: ReadonlyArray<{ offset: number; opacity: number }>;
  /** Lit dash chasing up the arm with the raise. */
  pulse?: boolean;
};

export function JointFigure({
  progress,
  regionProps,
  peeled = null,
  ghostTrail = [],
  pulse = false,
}: JointFigureProps) {
  const p = clamp01(progress);
  const pose = jpArmPose(p);
  const seq = jointSeq(p);
  const scapAngle = jpScapAngle(p);
  const pulseOffset = 22 - JP_ARM_PATH_LEN * p;
  const region = (id: JointRegionId) => regionProps?.(id) ?? {};

  return (
    <g className="jp-figure-root">
      {/* —— The figure — torso context, dim ———————————————————— */}
      <g className="jp-figure">
        <circle className="rp-bone rp-bone--dim" cx="158" cy="68" r="13" />
        <line className="rp-bone rp-bone--dim" x1="152" y1="80" x2="152" y2="104" />
        <line className="rp-bone rp-bone--dim" x1="167" y1="82" x2="167" y2="100" />
        <line className="rp-bone rp-bone--dim" x1="158" y1="104" x2="158" y2="216" />
        <path className="rp-bone rp-bone--dim" d="M124 148 Q160 136 198 144" />
        <path className="rp-bone rp-bone--dim" d="M126 148 C120 176 122 200 130 218" />
        <path className="rp-bone rp-bone--dim" d="M196 146 C202 174 200 198 192 216" />
        <path className="rp-bone rp-bone--faint" d="M132 222 Q162 230 190 220" />
        <path className="rp-bone rp-bone--dim" d="M124 148 L120 186 Q119 200 118 212" />
        <circle className="rp-joint rp-joint--dim" cx="118" cy="213" r="2.4" />
        <path className="rp-bone rp-bone--faint" d="M140 224 L136 276" />
        <path className="rp-bone rp-bone--faint" d="M184 222 L186 276" />
        <line className="rp-ground" x1="104" y1="280" x2="220" y2="280" />
      </g>

      {/* —— Soft tissue: brass-outlined muscle regions —————————— */}
      <path className={`jp-muscle${seq.deltoid ? ' is-lit' : ''}`} d={JP_DELTOID} />
      <path
        className={`jp-muscle jp-muscle--strap${seq.levator ? ' is-lit' : ''}`}
        d={JP_LEVATOR}
      />
      <g
        className={`jp-region${seq.trapezius ? ' is-lit' : ''}${peeled === 'trapezius' ? ' is-peeled' : ''}`}
        aria-label="Upper trapezius — tap to peel"
        {...region('trapezius')}
      >
        <path className="jp-hit" d={JP_TRAPEZIUS} />
        <path className="jp-muscle" d={JP_TRAPEZIUS} />
      </g>

      {/* —— Bone layer —————————————————————————————————————————— */}
      <path className="jp-bone" d={JP_CLAVICLE} />
      <g
        className={`jp-region jp-region--scap${seq.scapula ? ' is-lit' : ''}${peeled === 'scapula' ? ' is-peeled' : ''}`}
        aria-label="Scapula — tap to peel"
        transform={`rotate(${jpRound(scapAngle)} ${JP_SCAP_PIVOT.x} ${JP_SCAP_PIVOT.y})`}
        {...region('scapula')}
      >
        <path className="jp-hit" d={JP_SCAPULA} />
        <path className="jp-bone jp-bone--scap" d={JP_SCAPULA} />
      </g>

      {/* Ghost trail — earlier poses of the same arm, smeared back. */}
      {ghostTrail.map((ghost) =>
        p - ghost.offset > 0.02 ? (
          <path
            key={ghost.offset}
            className="rp-ghost"
            d={jpArmPath(p - ghost.offset)}
            style={{ opacity: ghost.opacity }}
          />
        ) : null
      )}

      {/* The working arm — humerus + forearm. */}
      <g
        className={`jp-region jp-region--arm${seq.counted ? ' is-lit' : ''}${peeled === 'arm' ? ' is-peeled' : ''}`}
        aria-label="Humerus — the arm. Tap to peel"
        {...region('arm')}
      >
        <path className="jp-hit jp-hit--arm" d={jpArmPath(p)} />
        <path className={`jp-arm${seq.counted ? ' is-counted' : ''}`} d={jpArmPath(p)} />
        {pulse && (
          <path
            className="rp-pulse"
            d={jpArmPath(p)}
            strokeDasharray="22 999"
            strokeDashoffset={pulseOffset}
          />
        )}
        <circle
          className="rp-hand"
          cx={jpRound(pose.wx)}
          cy={jpRound(pose.wy)}
          r="3"
          style={{ opacity: 0.45 + p * 0.55 }}
        />
        <circle className="jp-elbow" cx={jpRound(pose.ex)} cy={jpRound(pose.ey)} r="2.2" />
      </g>
      <circle className="rp-pivot" cx={JP_PIVOT.x} cy={JP_PIVOT.y} r="2.6" />
    </g>
  );
}

export default JointFigure;
