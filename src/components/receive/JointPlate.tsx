'use client';

import { useId, useRef, useState } from 'react';
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

type PeelId = 'trapezius' | 'scapula' | 'arm';

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
  className?: string;
};

// —— Plate geometry (viewBox 0 0 320 372, shared with ReachPlate) ————————
const PIVOT = { x: 192, y: 142 }; // glenoid — the instrument's origin
const UPPER = 48; // humerus
const FORE = 44; // forearm
const R = UPPER + FORE; // protractor / hand radius
const A0 = 0.1; // resting angle off straight-down
const A1 = Math.PI - 0.1; // overhead
const ARM_PATH_LEN = UPPER + FORE + 8;

// The reach protocol's real counting line: a rep counts past 135° of
// elevation (reachProcessor.RAISED_DEG). Drawn on the protractor.
const REP_DEG = 135;
const REP_A = (REP_DEG * Math.PI) / 180;
const REP_P = (REP_A - A0) / (A1 - A0);

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const f = (n: number) => Math.round(n * 100) / 100;

/** Glenoid → elbow → wrist for a given raise amount (ReachPlate's pose). */
function armPose(pp: number) {
  const t = clamp01(pp);
  const a = A0 + t * (A1 - A0);
  const ex = PIVOT.x + UPPER * Math.sin(a);
  const ey = PIVOT.y + UPPER * Math.cos(a);
  const af = a - 0.15 * (1 - t);
  const wx = ex + FORE * Math.sin(af);
  const wy = ey + FORE * Math.cos(af);
  return { ex, ey, wx, wy };
}

function armPath(pp: number) {
  const { ex, ey, wx, wy } = armPose(pp);
  return `M${PIVOT.x} ${PIVOT.y} L${f(ex)} ${f(ey)} L${f(wx)} ${f(wy)}`;
}

const TICKS = Array.from({ length: 7 }, (_, i) => i * 30); // 0..180

// —— Anatomy paths ————————————————————————————————————————————
// Muscle regions: brass-outlined soft tissue over the bone layer.
const TRAPEZIUS = 'M160 92 Q150 110 156 126 L196 138 L195 146 Q170 140 159 130 Q153 108 162 94 Z';
const LEVATOR = 'M162 94 Q165 120 169 148 L175 146 Q171 118 168 92 Z';
const DELTOID =
  'M180 126 Q192 117 205 128 Q215 140 210 156 Q202 147 194 146 Q184 148 178 158 Q174 141 180 126 Z';
// Bones: clavicle (fixed) + scapula (rotates upward as the arm rises) +
// humerus (the working arm path itself).
const CLAVICLE = 'M158 124 Q178 124 197 138';
const SCAPULA = 'M170 150 Q186 142 201 149 L197 200 Q185 209 177 201 Z';
const SCAP_PIVOT = { x: 196, y: 148 }; // glenoid corner — rotation origin
const SCAP_ROT = -13; // upward rotation at full raise, degrees

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
  className = '',
}: JointPlateProps) {
  const uid = useId().replace(/:/g, '');
  const p = clamp01(progress);
  const pose = armPose(p);
  const lit = litPips ?? Math.min(pips, Math.floor(p * (pips + 0.001)));
  const pulseOffset = 22 - ARM_PATH_LEN * p;
  const elevDeg = (A0 + p * (A1 - A0)) * (180 / Math.PI);

  // —— Live margin readouts, in the meter's own metric names ————————
  // elevation: the real metric (shoulder→elbow angle from straight-down).
  // sway / L–R: illustrative plate values in the meter's units — a clean
  // demo figure sways little and stays nearly matched.
  const swayDeg = (1 + 2 * Math.sin(Math.PI * Math.min(1, p * 1.15))).toFixed(0);
  const lrRatio = (0.94 + 0.06 * Math.min(1, p * 1.2)).toFixed(2);

  // —— The tour sequence — each region lights as its role plays ——————
  const seq = {
    deltoid: p > 0.06,
    trapezius: p > 0.3,
    scapula: p > 0.5,
    levator: p > 0.55,
    counted: p > REP_P,
  };
  const scapAngle = SCAP_ROT * Math.min(1, p * 1.15);

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

      {/* —— Margin panels: live values in the meter's own names ———— */}
      <g className="jp-panels" aria-hidden="true">
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
      <path className={`jp-muscle${seq.deltoid ? ' is-lit' : ''}`} d={DELTOID} />
      <path className={`jp-muscle jp-muscle--strap${seq.levator ? ' is-lit' : ''}`} d={LEVATOR} />
      <g
        className={`jp-region${seq.trapezius ? ' is-lit' : ''}${peeled === 'trapezius' ? ' is-peeled' : ''}`}
        aria-label="Upper trapezius — tap to peel"
        {...regionProps('trapezius')}
      >
        <path className="jp-hit" d={TRAPEZIUS} />
        <path className="jp-muscle" d={TRAPEZIUS} />
      </g>

      {/* —— Bone layer —————————————————————————————————————————— */}
      <path className="jp-bone" d={CLAVICLE} />
      <g
        className={`jp-region jp-region--scap${seq.scapula ? ' is-lit' : ''}${peeled === 'scapula' ? ' is-peeled' : ''}`}
        aria-label="Scapula — tap to peel"
        transform={`rotate(${f(scapAngle)} ${SCAP_PIVOT.x} ${SCAP_PIVOT.y})`}
        {...regionProps('scapula')}
      >
        <path className="jp-hit" d={SCAPULA} />
        <path className="jp-bone jp-bone--scap" d={SCAPULA} />
      </g>

      {/* Ghost trail — earlier poses of the same arm, smeared back. */}
      {GHOST_OFFSETS.map((off, i) =>
        p - off > 0.02 ? (
          <path
            key={off}
            className="rp-ghost"
            d={armPath(p - off)}
            style={{ opacity: GHOST_OPACITY[i] }}
          />
        ) : null
      )}

      {/* The working arm — humerus + forearm, peelable. */}
      <g
        className={`jp-region jp-region--arm${seq.counted ? ' is-lit' : ''}${peeled === 'arm' ? ' is-peeled' : ''}`}
        aria-label="Humerus — the arm. Tap to peel"
        {...regionProps('arm')}
      >
        <path className="jp-hit jp-hit--arm" d={armPath(p)} />
        <path className={`jp-arm${seq.counted ? ' is-counted' : ''}`} d={armPath(p)} />
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
        <circle className="jp-elbow" cx={f(pose.ex)} cy={f(pose.ey)} r="2.2" />
      </g>
      <circle className="rp-pivot" cx={PIVOT.x} cy={PIVOT.y} r="2.6" />

      {/* —— Engraved micro-labels with hairline leaders —————————— */}
      <g className="jp-labels" aria-hidden="true">
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
