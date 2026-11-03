/**
 * shoulderAnatomy — the shared geometry of "Fig 1 · The Shoulder".
 *
 * JointPlate (the foyer's teardown plate), the anatomical FramingGhost
 * (the session's viewfinder) and LiveJointInset (the in-read "muscle
 * talking" readout) all draw the same shoulder from these constants —
 * one drawing, three surfaces, so the lesson the foyer teaches is the
 * figure the session frames and reads against.
 *
 * Pure module: no React, no styles — safe to share between components
 * and to unit test.
 */

// —— Plate geometry (viewBox space 0 0 320 372, shared with ReachPlate) ——
export const JP_PIVOT = { x: 192, y: 142 }; // glenoid — the instrument's origin
export const JP_UPPER = 48; // humerus
export const JP_FORE = 44; // forearm
export const JP_R = JP_UPPER + JP_FORE; // protractor / hand radius
export const JP_A0 = 0.1; // resting angle off straight-down, radians
export const JP_A1 = Math.PI - 0.1; // overhead
export const JP_ARM_PATH_LEN = JP_UPPER + JP_FORE + 8; // dash budget for the pulse chase

// The reach protocol's real counting line: a rep counts past 135° of
// elevation (reachProcessor.RAISED_DEG). Drawn on the protractor, and the
// same threshold that lights the arm in the live inset.
export const JP_REP_DEG = 135;
export const JP_REP_A = (JP_REP_DEG * Math.PI) / 180;
export const JP_REP_P = (JP_REP_A - JP_A0) / (JP_A1 - JP_A0);

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const jpRound = (n: number) => Math.round(n * 100) / 100;

/** Glenoid → elbow → wrist for a given raise amount (ReachPlate's pose). */
export function jpArmPose(pp: number) {
  const t = clamp01(pp);
  const a = JP_A0 + t * (JP_A1 - JP_A0);
  const ex = JP_PIVOT.x + JP_UPPER * Math.sin(a);
  const ey = JP_PIVOT.y + JP_UPPER * Math.cos(a);
  const af = a - 0.15 * (1 - t);
  const wx = ex + JP_FORE * Math.sin(af);
  const wy = ey + JP_FORE * Math.cos(af);
  return { ex, ey, wx, wy };
}

export function jpArmPath(pp: number) {
  const { ex, ey, wx, wy } = jpArmPose(pp);
  return `M${JP_PIVOT.x} ${JP_PIVOT.y} L${jpRound(ex)} ${jpRound(ey)} L${jpRound(wx)} ${jpRound(wy)}`;
}

/** Degree ticks around the pivot, right semicircle (0..180). */
export const JP_TICKS = Array.from({ length: 7 }, (_, i) => i * 30);

// —— Anatomy paths ————————————————————————————————————————————————
// Muscle regions: brass-outlined soft tissue over the bone layer.
export const JP_TRAPEZIUS =
  'M160 92 Q150 110 156 126 L196 138 L195 146 Q170 140 159 130 Q153 108 162 94 Z';
export const JP_LEVATOR = 'M162 94 Q165 120 169 148 L175 146 Q171 118 168 92 Z';
export const JP_DELTOID =
  'M180 126 Q192 117 205 128 Q215 140 210 156 Q202 147 194 146 Q184 148 178 158 Q174 141 180 126 Z';
// Bones: clavicle (fixed) + scapula (rotates upward as the arm rises) +
// humerus (the working arm path itself).
export const JP_CLAVICLE = 'M158 124 Q178 124 197 138';
export const JP_SCAPULA = 'M170 150 Q186 142 201 149 L197 200 Q185 209 177 201 Z';
export const JP_SCAP_PIVOT = { x: 196, y: 148 }; // glenoid corner — rotation origin
export const JP_SCAP_ROT = -13; // upward rotation at full raise, degrees

/**
 * The tour sequence — each region lights as its role plays. Identical for
 * the foyer plate's loop, the framing ghost's mid-raise pose and the live
 * inset's measured progress, so "the trap lighting up as she raises"
 * means the same thing on every surface.
 */
export function jointSeq(p: number) {
  return {
    deltoid: p > 0.06,
    trapezius: p > 0.3,
    scapula: p > 0.5,
    levator: p > 0.55,
    counted: p > JP_REP_P,
  };
}

/** Scapular upward rotation for a raise amount (lags the arm slightly). */
export function jpScapAngle(p: number) {
  return JP_SCAP_ROT * Math.min(1, clamp01(p) * 1.15);
}

/**
 * Map a measured arm elevation — degrees from straight-down, the exact
 * value reachProcessor's readArm publishes on poseData.*ShoulderAngle —
 * onto plate progress, so the inset arm mirrors the raise 1:1 and the
 * region thresholds line up with the meter's counting line.
 * (0° hanging → ~0, 135° → the rep line, 180° overhead → 1.)
 */
export function reachElevationToProgress(elevationDeg: number): number {
  return clamp01(((elevationDeg * Math.PI) / 180 - JP_A0) / (JP_A1 - JP_A0));
}
