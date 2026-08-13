/**
 * Shared elbow → SVG forearm geometry for the twin peek and the
 * see→show juxtaposition. Keep the mapping identical so the user's arm
 * and the coach's arm read as the same instrument.
 *
 * SVG rotate() is clockwise and the forearm path points screen-right at
 * rotation 0. Mapping: rotation = 180 - deg so the limb folds upward as
 * it curls, matching how the persona demos read on a desk.
 */

export function clampElbowDeg(deg: number): number {
  return Math.max(0, Math.min(180, deg));
}

export function elbowDegToForearmRotation(elbowDeg: number): number {
  return 180 - clampElbowDeg(elbowDeg);
}

export function polar(cx: number, cy: number, r: number, rotationDeg: number) {
  const rad = ((rotationDeg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

/** Dial tick marks every 30°, anchored to the same hub as the forearm. */
export const DIAL_TICKS = [0, 30, 60, 90, 120, 150, 180].map((deg) => {
  const rotation = elbowDegToForearmRotation(deg);
  const rad = ((rotation - 90) * Math.PI) / 180;
  return {
    deg,
    x1: 18 + Math.cos(rad) * 24,
    y1: 44 + Math.sin(rad) * 24,
    x2: 18 + Math.cos(rad) * 27.5,
    y2: 44 + Math.sin(rad) * 27.5,
    major: deg % 60 === 0,
  };
});

/** Curvature indicator from `from` toward the current elbow angle. */
export function buildRangeArc(fromDeg: number, currentDeg: number): string | null {
  const delta = clampElbowDeg(currentDeg) - clampElbowDeg(fromDeg);
  if (Math.abs(delta) < 4) return null;
  const fromRot = elbowDegToForearmRotation(fromDeg);
  const curRot = elbowDegToForearmRotation(currentDeg);
  const start = polar(18, 44, 21, fromRot);
  const end = polar(18, 44, 21, curRot);
  const midRot = (fromRot + curRot) / 2;
  const mid = polar(18, 44, 23.5, midRot);
  return [
    `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
    `Q ${mid.x.toFixed(1)} ${mid.y.toFixed(1)}`,
    `${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
  ].join(' ');
}

/** Absolute gap between two elbow angles, rounded to a demo-legible degree. */
export function elbowGapDeg(
  userDeg: number | null | undefined,
  coachDeg: number | null | undefined
): number | null {
  if (
    userDeg == null ||
    coachDeg == null ||
    !Number.isFinite(userDeg) ||
    !Number.isFinite(coachDeg)
  ) {
    return null;
  }
  return Math.abs(Math.round(clampElbowDeg(userDeg) - clampElbowDeg(coachDeg)));
}
