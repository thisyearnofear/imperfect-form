'use client';

import { useEffect } from 'react';

/**
 * Publish live coaching quality onto <body> so the day-0 atmosphere can react
 * to the athlete rather than only to cue events.
 *
 * Why this exists: `useCoachBayPulse` already bridges coach-station cues onto
 * `body[data-coach-pulse]`, so the arm glows when the coach speaks. But the cue
 * is the coach's output, not the athlete's input. Nothing on the landing
 * surface responded to how the movement actually *was* — which is why the bay
 * read as a static backdrop with a robot in it rather than a coach in a room.
 *
 * The three attributes written here let the atmosphere be causal:
 *
 *   data-coach-rep      a rep just completed (transient, cleared after a beat)
 *   data-coach-quality  continuous grade band for the current rep:
 *                       'good' | 'off' | 'poor' | null when unknown
 *   data-coach-depth    normalized range-of-motion 0-1, written as a percentage
 *
 * All three are written to <body> rather than passed as props because the
 * atmosphere is a fixed backdrop mounted in page.tsx, a different subtree from
 * the session HUD that produces the numbers. This mirrors the existing
 * data-coach-pulse convention rather than inventing a second one.
 *
 * Nothing here gates coaching or affects grading — it is presentation only, and
 * every attribute is cleared on unmount.
 */

export type CoachQualityBand = 'good' | 'off' | 'poor';

const REP_ATTRIBUTE = 'data-coach-rep';
const QUALITY_ATTRIBUTE = 'data-coach-quality';
const DEPTH_ATTRIBUTE = 'data-coach-depth';

/** How long the rep attribute lingers before it is cleared. */
const REP_LINGER_MS = 700;

/**
 * Map a 0-100 form score onto the three bands the atmosphere distinguishes.
 *
 * Thresholds match the coaching engine's own grade table (docs/COACH_GATES.md):
 * 80 is the good-form line, 60 the "keep adjusting" line. Null means no score
 * yet, which the atmosphere renders as "no opinion" rather than neutral-good.
 */
export function qualityBandFor(formScore: number | null | undefined): CoachQualityBand | null {
  if (typeof formScore !== 'number' || !Number.isFinite(formScore)) return null;
  if (formScore >= 80) return 'good';
  if (formScore < 60) return 'poor';
  return 'off';
}

export function useCoachAtmosphereBridge({
  repCount,
  formScore,
  depth,
  active,
}: {
  repCount: number;
  formScore: number | null | undefined;
  depth: number | null | undefined;
  /** False before a session starts — clears every attribute. */
  active: boolean;
}): void {
  // Quality band: continuous, written whenever it changes.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!active) {
      body.removeAttribute(QUALITY_ATTRIBUTE);
      body.removeAttribute(DEPTH_ATTRIBUTE);
      return;
    }
    const band = qualityBandFor(formScore);
    if (band) body.setAttribute(QUALITY_ATTRIBUTE, band);
    else body.removeAttribute(QUALITY_ATTRIBUTE);

    if (typeof depth === 'number' && Number.isFinite(depth)) {
      body.setAttribute(DEPTH_ATTRIBUTE, String(Math.round(Math.max(0, Math.min(1, depth)))));
    } else {
      body.removeAttribute(DEPTH_ATTRIBUTE);
    }
  }, [active, formScore, depth]);

  // Rep attribute: transient, set on increment then cleared.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!active || repCount < 1) {
      body.removeAttribute(REP_ATTRIBUTE);
      return;
    }
    body.setAttribute(REP_ATTRIBUTE, String(repCount));
    const timer = window.setTimeout(() => {
      if (body.getAttribute(REP_ATTRIBUTE) === String(repCount)) {
        body.removeAttribute(REP_ATTRIBUTE);
      }
    }, REP_LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [active, repCount]);

  // Clear everything on unmount so a finished session leaves no residue.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    return () => {
      body.removeAttribute(REP_ATTRIBUTE);
      body.removeAttribute(QUALITY_ATTRIBUTE);
      body.removeAttribute(DEPTH_ATTRIBUTE);
    };
  }, []);
}
