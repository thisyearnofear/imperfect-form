'use client';

import React from 'react';
import type { ExerciseMode } from '@/utils/biomechanics';
import '@/styles/movement-preview.css';

type MovementPreviewProps = {
  mode: ExerciseMode;
  label: string;
};

const SHORT_LINES: Record<ExerciseMode, string> = {
  curls: 'Pinned elbow · watch the forearm sweep',
  pushups: 'Straight line · chest to floor',
  squats: 'Hips back · knees track',
  pullups: 'Full extension · chin over bar',
  jumps: 'Soft landing · knees bend',
};

/**
 * Living movement preview for the foyer. Renders a looping silhouette of the
 * selected movement so the pick becomes a moment before the camera turns on.
 *
 * Figures are hand-drawn SVG in the same stroke language as the framing
 * diagram; each mode has its own keyframe loop (see movement-preview.css).
 * Keyed by `mode` from the parent so switching restarts the animation.
 */
export function MovementPreview({ mode, label }: MovementPreviewProps) {
  return (
    <div
      className={`movement-preview movement-preview--${mode} motion-enter`}
      role="img"
      aria-label={`${label}: ${SHORT_LINES[mode]}`}
    >
      <span className="movement-preview__eyebrow" aria-hidden="true">
        {label} preview
      </span>
      <div className="movement-preview__figure" aria-hidden="true">
        {mode === 'curls' ? <CurlFigure /> : null}
        {mode === 'pushups' ? <PushupFigure /> : null}
        {mode === 'squats' ? <SquatFigure /> : null}
        {mode === 'pullups' ? <PullupFigure /> : null}
        {mode === 'jumps' ? <JumpFigure /> : null}
      </div>
      <span className="movement-preview__caption">{SHORT_LINES[mode]}</span>
    </div>
  );
}

/** Curl: upper arm hangs, forearm sweeps about the elbow. */
function CurlFigure() {
  return (
    <svg viewBox="0 0 220 160" focusable="false">
      <path className="movement-preview__arc" d="M78 92 a 50 50 0 0 1 -12 -38" />
      <circle className="movement-preview__joint" cx="78" cy="92" r="4.5" />
      <line className="movement-preview__bone" x1="78" y1="30" x2="78" y2="92" />
      <g className="movement-preview__forearm">
        <line className="movement-preview__bone" x1="78" y1="92" x2="78" y2="146" />
        <circle className="movement-preview__hand" cx="78" cy="148" r="5" />
      </g>
      <circle className="movement-preview__shoulder" cx="78" cy="27" r="6" />
    </svg>
  );
}

/** Pushup: body pivots about the planted toes. */
function PushupFigure() {
  return (
    <svg viewBox="0 0 220 160" focusable="false">
      <line className="movement-preview__floor" x1="28" y1="128" x2="192" y2="128" />
      <g className="movement-preview__body">
        <circle className="movement-preview__head" cx="78" cy="70" r="11" />
        <line className="movement-preview__bone" x1="84" y1="82" x2="118" y2="94" />
        <line className="movement-preview__bone" x1="118" y1="94" x2="168" y2="116" />
        <line className="movement-preview__bone" x1="88" y1="86" x2="58" y2="116" />
        <circle className="movement-preview__foot" cx="170" cy="120" r="4" />
        <circle className="movement-preview__hand" cx="58" cy="120" r="4" />
      </g>
    </svg>
  );
}

/** Squat: upper body sinks and leans forward over planted feet. */
function SquatFigure() {
  return (
    <svg viewBox="0 0 220 160" focusable="false">
      <line className="movement-preview__floor" x1="38" y1="134" x2="182" y2="134" />
      <line className="movement-preview__bone" x1="98" y1="130" x2="98" y2="118" />
      <line className="movement-preview__bone" x1="122" y1="130" x2="122" y2="118" />
      <line className="movement-preview__bone" x1="98" y1="118" x2="110" y2="112" />
      <line className="movement-preview__bone" x1="122" y1="118" x2="110" y2="112" />
      <g className="movement-preview__sink">
        <circle className="movement-preview__head" cx="110" cy="42" r="11" />
        <line className="movement-preview__bone" x1="110" y1="56" x2="110" y2="96" />
        <line className="movement-preview__bone" x1="104" y1="64" x2="76" y2="88" />
        <line className="movement-preview__bone" x1="116" y1="64" x2="144" y2="88" />
        <circle className="movement-preview__hand" cx="76" cy="92" r="4" />
        <circle className="movement-preview__hand" cx="144" cy="92" r="4" />
      </g>
    </svg>
  );
}

/** Pullup: body hangs from the bar and pulls the chin up. */
function PullupFigure() {
  return (
    <svg viewBox="0 0 220 160" focusable="false">
      <line className="movement-preview__bar" x1="52" y1="34" x2="168" y2="34" />
      <g className="movement-preview__hang">
        <circle className="movement-preview__head" cx="110" cy="56" r="11" />
        <line className="movement-preview__bone" x1="110" y1="70" x2="110" y2="110" />
        <line className="movement-preview__bone" x1="104" y1="74" x2="96" y2="34" />
        <line className="movement-preview__bone" x1="116" y1="74" x2="124" y2="34" />
        <line className="movement-preview__bone" x1="110" y1="110" x2="92" y2="128" />
        <line className="movement-preview__bone" x1="110" y1="110" x2="128" y2="128" />
        <circle className="movement-preview__hand" cx="96" cy="34" r="4.5" />
        <circle className="movement-preview__hand" cx="124" cy="34" r="4.5" />
      </g>
    </svg>
  );
}

/** Jump: crouch, leap, land. */
function JumpFigure() {
  return (
    <svg viewBox="0 0 220 160" focusable="false">
      <line className="movement-preview__floor" x1="38" y1="134" x2="182" y2="134" />
      <g className="movement-preview__leap">
        <circle className="movement-preview__head" cx="110" cy="44" r="11" />
        <line className="movement-preview__bone" x1="110" y1="58" x2="110" y2="98" />
        <line className="movement-preview__bone" x1="104" y1="66" x2="80" y2="90" />
        <line className="movement-preview__bone" x1="116" y1="66" x2="140" y2="90" />
        <line className="movement-preview__bone" x1="110" y1="98" x2="98" y2="126" />
        <line className="movement-preview__bone" x1="110" y1="98" x2="122" y2="126" />
        <circle className="movement-preview__hand" cx="80" cy="94" r="4" />
        <circle className="movement-preview__hand" cx="140" cy="94" r="4" />
        <circle className="movement-preview__foot" cx="98" cy="130" r="4" />
        <circle className="movement-preview__foot" cx="122" cy="130" r="4" />
      </g>
    </svg>
  );
}
