'use client';

import { useId, useRef, useState } from 'react';
import { JointFigure, type JointRegionId } from './JointFigure';
import {
  JP_A0 as A0,
  JP_A1 as A1,
  JP_PIVOT as PIVOT,
  JP_R as R,
  JP_REP_A as REP_A,
  JP_TICKS as TICKS,
  clamp01,
  jpArmPose as armPose,
  jpRound as f,
  jointSeq,
} from './shoulderAnatomy';
import '@/styles/receiving-foyer.css';

/**
 * JointPlate — "Fig 1 · The Shoulder". ReachPlate's frame chrome (brass
 * rules, protractor arc, degree ticks, corner ticks, pip row) with the
 * interior upgraded into a live anatomical teardown: clavicle, scapula and
 * humerus as hairline bones under brass-outlined muscle regions, engraved
 * micro-labels with leader lines, and live-read margin panels.
 *
 * The same `progress` prop the reach figure takes drives everything — arm
 * pose, swept arc, region lighting sequence (deltoid → trapezius → scapula
 * → levator → rep-counted arm) and the margin readouts — so the loop, the
 * tap-rep and the hold-scrub all play through one instrument. Tapping a
 * labeled region peels it: the part lights brass and a hairline callout
 * names what it honestly contributes (proxies, not diagnosis). Under
 * reduced motion the parent loop parks the arm raised; the labels, panels
 * and peel still read.
 */

type PeelId = JointRegionId;

export type JointPlateProps = {
  /** 0..1 — 0 arm hanging, 1 arm overhead (same contract as ReachPlate). */
  progress: number;
  /** Engraved top caption. */
  caption?: string;
  /** Engraved bottom caption. */
  plateNum?: string;
  /** Trailing smear poses (0 disables). */
  ghostCount?: number;
  /** Number of pips along the base edge (0 hides the row). */
  pips?: number;
  /** How many pips read lit. Defaults to floor(progress * pips). */
  litPips?: number;
  /** Tap-to-peel region callouts. Off for static minis (SessionRecap). */
  interactive?: boolean;
  /** Quiet figure — hides the anatomy micro-labels and the live-read
   *  margin panels; frame, figure, arc, loop, pips and peel all stay. The
   *  teaching chrome is earned: the parent decides when the instrument
   *  wakes (a picked joint, the post-envelope beat, the Read beat's full
   *  plate). Flipping quiet off mounts `.jp-detail`, whose entrance
   *  animation is the reveal — instant under reduced motion. */
  quiet?: boolean;
  className?: string;
};

// —— Plate geometry + anatomy paths live in ./shoulderAnatomy — the same
// constants drive the framing ghost and the live session inset, so the
// teardown reads identically on all three surfaces.

const PEEL_COPY: Record<PeelId, { name: string; lines: string[]; ax: number; ay: number }> = {
  trapezius: {
    name: 'Upper trapezius',
    lines: ['lifts the shoulder blade —', 'the muscle this read proxies'],
    ax: 172,
    ay: 118,
  },
  scapula: {
    name: 'Scapula',
    lines: ['the overhead line lives here —', 'the arm borrows its turn'],
    ax: 184,
    ay: 184,
  },
  arm: {
    name: 'Humerus',
    lines: ['a rep counts past 135° —', 'the meter reads angle, not ache'],
    ax: 0,
    ay: 0, // follows the elbow
  },
};

export function JointPlate({
  progress,
  caption = '· Fig 1 · The Shoulder ·',
  plateNum = 'Plate I',
  ghostCount = 2,
  pips = 5,
  litPips,
  interactive = true,
  quiet = false,
  className = '',
}: JointPlateProps) {
  const uid = useId().replace(/:/g, '');
  const p = clamp01(progress);
  const pose = armPose(p);
  const lit = litPips ?? Math.min(pips, Math.floor(p * (pips + 0.001)));
  const elevDeg = (A0 + p * (A1 - A0)) * (180 / Math.PI);

  // —— Live margin readouts, in the meter's own metric names ————————
  // elevation: the real metric (shoulder→elbow angle from straight-down).
  // sway / L–R: illustrative plate values in the meter's units — a clean
  // demo figure sways little and stays nearly matched.
  const swayDeg = (1 + 2 * Math.sin(Math.PI * Math.min(1, p * 1.15))).toFixed(0);
  const lrRatio = (0.94 + 0.06 * Math.min(1, p * 1.2)).toFixed(2);

  // —— The tour sequence — each region lights as its role plays ——————
  // Shared with the ghost + live inset via jointSeq (./shoulderAnatomy).
  const seq = jointSeq(p);

  // —— Peel-the-part ———————————————————————————————————————————
  const [peeled, setPeeled] = useState<PeelId | null>(null);
  const peelDown = useRef<{ x: number; y: number; t: number } | null>(null);

  const onRegionDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    peelDown.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onRegionUp = (id: PeelId) => (e: React.PointerEvent) => {
    const d = peelDown.current;
    peelDown.current = null;
    if (!interactive || !d) return;
    const tapLike =
      performance.now() - d.t < 500 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10;
    if (tapLike) {
      // A peel tap is not a rep — keep the plate's tap-to-raise out of it.
      e.stopPropagation();
      setPeeled((cur) => (cur === id ? null : id));
    }
  };
  const onRegionKey = (id: PeelId) => (e: React.KeyboardEvent) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setPeeled((cur) => (cur === id ? null : id));
    }
  };
  // Tap anywhere that isn't a peelable part closes the card.
  const onPlateDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!(e.target as Element).closest?.('.jp-region')) setPeeled(null);
  };

  const peelInfo = peeled ? PEEL_COPY[peeled] : null;
  const peelAnchor: { x: number; y: number } | null =
    peeled === 'arm'
      ? { x: pose.ex, y: pose.ey }
      : peeled
        ? { x: PEEL_COPY[peeled].ax, y: PEEL_COPY[peeled].ay }
        : null;

  const GHOST_OFFSETS = [0.09, 0.18].slice(0, Math.max(0, ghostCount));
  const GHOST_OPACITY = [0.22, 0.12];
  const regionProps = (id: PeelId) =>
    interactive
      ? {
          role: 'button' as const,
          tabIndex: 0,
          onPointerDown: onRegionDown,
          onPointerUp: onRegionUp(id),
          onKeyDown: onRegionKey(id),
        }
      : {};

  return (
    <svg
      className={`joint-plate${className ? ` ${className}` : ''}`}
      viewBox="0 0 320 372"
      role="img"
      aria-label="Engraved anatomical plate: the shoulder joint — clavicle, scapula and humerus under labeled muscle regions — raising one arm while margin panels read elevation, sway and left-right."
      onPointerDown={onPlateDown}
    >
      <defs>
        <pattern
          id={`jp-hatch-${uid}`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" className="rp-hatch-line" />
        </pattern>
        <clipPath id={`jp-clip-${uid}`}>
          <rect x="13" y="13" width="294" height="346" rx="2" />
        </clipPath>
      </defs>

      {/* Faint engraved hatch, clipped inside the inner rule. */}
      <rect
        x="13"
        y="13"
        width="294"
        height="346"
        clipPath={`url(#jp-clip-${uid})`}
        fill={`url(#jp-hatch-${uid})`}
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

      {/* Protractor: plumb line, ideal + swept arc, degree ticks. */}
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
        strokeDasharray={`${Math.min(1, p * 1.04)} 1`}
        style={{ opacity: 0.85 }}
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

      {/* The protocol's counting line, marked on the protractor. */}
      <line
        className={`jp-rep-tick${seq.counted ? ' is-lit' : ''}`}
        x1={PIVOT.x + (R + 2) * Math.sin(REP_A)}
        y1={PIVOT.y + (R + 2) * Math.cos(REP_A)}
        x2={PIVOT.x + (R + 15) * Math.sin(REP_A)}
        y2={PIVOT.y + (R + 15) * Math.cos(REP_A)}
      />
      <text
        className={`rp-deg-label jp-rep-label${seq.counted ? ' is-lit' : ''}`}
        x={PIVOT.x + (R + 19) * Math.sin(REP_A)}
        y={PIVOT.y + (R + 19) * Math.cos(REP_A) + 2}
      >
        135°
      </text>

      {/* —— Margin panels: live values in the meter's own names ————
          Detail chrome (panels + labels below) mounts only when the plate
          is awake — quiet heroes keep the figure without the teaching. */}
      {!quiet && (
        <g className="jp-detail" aria-hidden="true">
          <g className="jp-panels">
            <text className="jp-panel-eyebrow" x="22" y="58">
              live read
            </text>
            <text className="jp-panel-label" x="22" y="72">
              elevation
            </text>
            <text className="jp-panel-value" x="112" y="72" textAnchor="end">
              ~{Math.round(elevDeg)}°
            </text>
            <path className="jp-panel-rule" d="M22 78 H112" />
            <text className="jp-panel-label" x="22" y="90">
              sway
            </text>
            <text className="jp-panel-value" x="112" y="90" textAnchor="end">
              ~{swayDeg}°
            </text>
            <path className="jp-panel-rule" d="M22 96 H112" />
            <text className="jp-panel-label" x="22" y="108">
              L–R
            </text>
            <text className="jp-panel-value" x="112" y="108" textAnchor="end">
              {lrRatio}
            </text>
            <path className="jp-panel-rule" d="M22 114 H112" />
          </g>
        </g>
      )}

      {/* —— The anatomical teardown — figure, muscle regions, bones and
          the working arm, shared with the framing ghost and the live
          session inset (./JointFigure). Peel wiring stays here. ———————— */}
      <JointFigure
        progress={p}
        peeled={peeled}
        regionProps={regionProps}
        ghostTrail={GHOST_OFFSETS.map((off, i) => ({
          offset: off,
          opacity: GHOST_OPACITY[i],
        }))}
        pulse
      />

      {/* —— Engraved micro-labels with hairline leaders —————————— */}
      {!quiet && (
        <g className="jp-detail" aria-hidden="true">
          <g className="jp-labels">
            <text className="jp-label" x="30" y="140">
              trapezius
            </text>
            <path className="jp-leader" d="M92 138 L150 122" />
            <text className="jp-label" x="30" y="164">
              levator
            </text>
            <path className="jp-leader" d="M74 162 L162 128" />
            <text className="jp-label" x="224" y="106">
              clavicle
            </text>
            <path className="jp-leader" d="M222 108 L194 127" />
            <text className="jp-label" x="238" y="184">
              deltoid
            </text>
            <path className="jp-leader" d="M236 181 L211 155" />
            <text className="jp-label" x="30" y="206">
              scapula
            </text>
            <path className="jp-leader" d="M74 203 L172 194" />
            <text className="jp-label" x="244" y="258">
              humerus
            </text>
            <path className="jp-leader" d="M242 255 L202 200" />
          </g>
        </g>
      )}

      {/* —— Peel callout: hairline card + leader to the part ————— */}
      {peelInfo && peelAnchor && (
        <g className="jp-callout" pointerEvents="none">
          <path
            className="jp-callout__leader"
            d={`M148 ${peelInfo.lines.length > 1 ? 240 : 232} L${f(peelAnchor.x)} ${f(peelAnchor.y)}`}
          />
          <rect
            className="jp-callout__card"
            x="18"
            y="226"
            width="150"
            height={peelInfo.lines.length > 1 ? 40 : 30}
            rx="2"
          />
          <text className="jp-callout__name" x="26" y="238">
            {peelInfo.name}
          </text>
          <text className="jp-callout__line" x="26" y={peelInfo.lines.length > 1 ? 250 : 244}>
            {peelInfo.lines[0]}
          </text>
          {peelInfo.lines[1] && (
            <text className="jp-callout__line" x="26" y="260">
              {peelInfo.lines[1]}
            </text>
          )}
        </g>
      )}

      {/* Engraved footnote. */}
      <text className="rp-footnote" x="20" y="300">
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

export default JointPlate;
