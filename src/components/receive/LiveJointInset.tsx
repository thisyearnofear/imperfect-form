'use client';

/**
 * LiveJointInset — "the muscle talking". Once the pose locks and the
 * anatomical framing ghost retires, this small plate stays in the corner
 * of the camera stage during a reach reading: the same shoulder teardown
 * the foyer taught, driven by the live read.
 *
 * `elevationDeg` is reachProcessor's own measurement — the shoulder→elbow
 * angle from straight-down the engine publishes on poseData's shoulder-
 * angle channels — mapped through reachElevationToProgress so the inset
 * arm mirrors her raise 1:1 and each region lights brass at the exact
 * thresholds JointPlate teaches (the trap lights as she raises, the arm
 * goes brass past the 135° counting line). When tracking drops, the arm
 * hangs — an honest resting figure, no stale glow.
 *
 * Deliberately quiet: hairline-only, no labels, no margin panels — region
 * glow only. Prop-driven like the plates, so reduced motion needs no
 * special case.
 */

import { JointFigure } from './JointFigure';
import { reachElevationToProgress } from './shoulderAnatomy';
import '@/styles/receiving-foyer.css';
import '@/styles/reach-plate.css';

export type LiveJointInsetProps = {
  /** Arm elevation in degrees from straight-down (reachProcessor's
      shoulder-angle channel: 0 hanging … 135 rep line … 180 overhead).
      Null when the pose isn't currently tracked. */
  elevationDeg: number | null;
  className?: string;
};

export function LiveJointInset({ elevationDeg, className = '' }: LiveJointInsetProps) {
  const p = reachElevationToProgress(elevationDeg ?? 0);
  return (
    <div
      className={`jp-live${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      data-elevation={elevationDeg == null ? '' : String(Math.round(elevationDeg))}
    >
      <svg
        className="jp-live__plate jp-anatomy"
        viewBox="108 42 188 214"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <JointFigure progress={p} ghostTrail={[{ offset: 0.1, opacity: 0.16 }]} pulse />
      </svg>
    </div>
  );
}

export default LiveJointInset;
