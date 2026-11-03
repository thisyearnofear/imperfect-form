'use client';

/**
 * FramingGhost — the plate's hairline figure ghosted over the live camera
 * feed while a reading session frames up: "stand where the figure stands".
 *
 * For reach readings the ghost carries the JointPlate anatomy instead of
 * the plain silhouette — clavicle/scapula/humerus bones under the
 * brass-outlined trapezius, levator and deltoid regions, posed mid-raise
 * so the regions read lit. Same drawing the foyer taught, same thresholds
 * the live inset lights against; it still serves framing (figure to
 * match, plumb + range arc) and still fades out on the first pose lock.
 *
 * Other sessions keep the original silhouette — ReachPlate's figure
 * verbatim (same hairline coordinates, same arm kinematics) cropped to
 * the body. Mounted inside `.session-camera-stage` above the boot loader:
 * during the positioning beat the loader dims the feed, so the ghost
 * rides on top of it at ~35% opacity. Reduced motion changes nothing
 * except the fade timing — the figure is already static.
 */

import type { ExerciseMode } from '@/utils/biomechanics';
import { JointFigure } from './JointFigure';
import '@/styles/receiving-foyer.css';
import '@/styles/reach-plate.css';

type FramingGhostProps = {
  /** True once the pose has locked — the ghost takes the fade. */
  leaving?: boolean;
  /** Reach readings frame against the shoulder teardown, not the silhouette. */
  mode?: ExerciseMode;
  className?: string;
};

// —— ReachPlate figure geometry (viewBox space 0 0 320 372) ————————————
const PIVOT = { x: 192, y: 142 };
const UPPER = 48;
const FORE = 44;
const R = UPPER + FORE;
const A0 = 0.1;
const A1 = Math.PI - 0.1;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const f = (n: number) => Math.round(n * 100) / 100;

/** Shoulder → elbow → wrist for a given raise amount (same math as the plate). */
function armPath(pp: number) {
  const t = clamp01(pp);
  const a = A0 + t * (A1 - A0);
  const ex = PIVOT.x + UPPER * Math.sin(a);
  const ey = PIVOT.y + UPPER * Math.cos(a);
  const af = a - 0.15 * (1 - t);
  const wx = ex + FORE * Math.sin(af);
  const wy = ey + FORE * Math.cos(af);
  return `M${PIVOT.x} ${PIVOT.y} L${f(ex)} ${f(ey)} L${f(wx)} ${f(wy)}`;
}

/** The pose the read asks for — mid-raise, regions lit brass. */
const GHOST_POSE = 0.65;

export function FramingGhost({ leaving = false, mode, className = '' }: FramingGhostProps) {
  const anatomical = mode === 'reach';
  return (
    <div
      className={`framing-ghost${anatomical ? ' framing-ghost--anatomy' : ''}${leaving ? ' is-leaving' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <svg
        className={`framing-ghost__figure${anatomical ? ' jp-anatomy' : ''}`}
        viewBox="60 16 232 274"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        {/* Plumb line + range arc — the framing aids the plate engraves. */}
        <line className="fg-plumb" x1={PIVOT.x} y1="40" x2={PIVOT.x} y2="286" />
        <path
          className="fg-arc"
          d={`M${PIVOT.x} ${PIVOT.y + R} A${R} ${R} 0 0 0 ${PIVOT.x} ${PIVOT.y - R}`}
        />
        {anatomical ? (
          /* The shoulder teardown as the viewfinder — the same figure,
             regions and thresholds as JointPlate / the live inset. */
          <JointFigure
            progress={GHOST_POSE}
            ghostTrail={[
              { offset: 0.09, opacity: 0.22 },
              { offset: 0.18, opacity: 0.12 },
            ]}
          />
        ) : (
          <>
            {/* The figure — same hairline drawing as ReachPlate's rp-figure. */}
            <circle className="fg-bone" cx="160" cy="100" r="14" />
            <line className="fg-bone" x1="160" y1="114" x2="160" y2="124" />
            <path className="fg-bone" d="M124 142 Q160 132 196 142" />
            <line className="fg-bone" x1="160" y1="124" x2="160" y2="212" />
            <path className="fg-bone" d="M130 214 Q160 220 190 214" />
            <path className="fg-bone fg-bone--dim" d="M128 142 C122 170 124 196 132 214" />
            <path className="fg-bone fg-bone--dim" d="M190 142 C196 170 194 196 186 214" />
            <path className="fg-bone fg-bone--dim" d="M128 142 L124 180 Q123 196 122 210" />
            <circle className="fg-joint" cx="122" cy="211" r="2.4" />
            <path className="fg-bone fg-bone--faint" d="M138 216 L134 268" />
            <path className="fg-bone fg-bone--faint" d="M184 216 L186 268" />
            <line className="fg-ground" x1="104" y1="274" x2="220" y2="274" />
            {/* The working arm, mid-raise — the pose the read asks for. */}
            <path className="fg-arm" d={armPath(GHOST_POSE)} />
            <circle className="fg-pivot" cx={PIVOT.x} cy={PIVOT.y} r="2.6" />
          </>
        )}
      </svg>
      <span className="framing-ghost__caption">Step back — match the figure</span>
    </div>
  );
}

export default FramingGhost;
