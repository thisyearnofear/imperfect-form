'use client';

import React from 'react';
import { ArmSchematic } from './ArmSchematic';
import { clampElbowDeg, elbowGapDeg } from '@/lib/armSchematic';
import { isTwinHeroActive, type CoachTwinState } from '@/hooks/useCoachTwin';
import { BRAND } from '@/lib/brandPositioning';
import '@/styles/see-show-moment.css';

const CURL_TARGET_MID_DEG = 60;

type SeeShowMomentProps = {
  twin: CoachTwinState;
  userElbowDeg?: number | null;
  /** First-signal celebration owns the stage for 2.2s — yield to it. */
  yieldToFirstSignal?: boolean;
};

/**
 * The pitch visual: user's arm and the coach's arm on the same instrument,
 * with the gap between them as the thing to close.
 *
 * Dock (always, when we have a user angle): compact YOU | GAP | COACH.
 * Hero (while the arm is sweeping): enlarged overlay with narration — the
 * demonstration as a moment, not a corner widget.
 */
export function SeeShowMoment({
  twin,
  userElbowDeg,
  yieldToFirstSignal = false,
}: SeeShowMomentProps) {
  const hasUser = userElbowDeg != null && Number.isFinite(userElbowDeg);
  if (!hasUser && !twin.enabled) return null;
  if (yieldToFirstSignal) return null;

  const observed = twin.progress?.measured_deg;
  const coachCurrent =
    observed !== undefined
      ? observed
      : twin.progress
        ? twin.progress.current_deg
        : twin.intent?.from_deg;
  const coachTarget = twin.intent?.to_deg ?? CURL_TARGET_MID_DEG;
  const coachDeg = coachCurrent ?? coachTarget;
  const userDeg = hasUser ? clampElbowDeg(userElbowDeg as number) : null;
  const gap = elbowGapDeg(userDeg, coachDeg);
  const hero = isTwinHeroActive(twin) && twin.enabled;
  const narration =
    twin.demo?.narration ??
    twin.intent?.narration ??
    (hero ? 'Watch the arm — then match the sweep.' : BRAND.loopLabel);
  const userLabel = userDeg != null ? `${Math.round(userDeg)}°` : '—';
  const coachLabel = `${Math.round(clampElbowDeg(coachDeg))}°`;

  if (!hero && !hasUser) return null;

  return (
    <div
      className={`see-show-moment${hero ? ' is-hero' : ' is-dock'}`}
      role="group"
      aria-label={
        gap != null
          ? `Your elbow ${userLabel}, coach ${coachLabel}, gap ${gap} degrees`
          : `Coach arm ${coachLabel}`
      }
    >
      <p className="see-show-moment__eyebrow">{hero ? 'WATCH THE GAP' : 'YOU · COACH'}</p>

      <div className="see-show-moment__split">
        <div className="see-show-moment__side see-show-moment__side--you">
          <span className="see-show-moment__who">You</span>
          <div className="see-show-moment__arm" aria-hidden="true">
            <ArmSchematic
              schematic
              currentDeg={userDeg ?? undefined}
              targetDeg={coachTarget}
              markerId="see-show-you-arrow"
            />
          </div>
          <strong className="see-show-moment__deg">{userLabel}</strong>
        </div>

        <div className="see-show-moment__gap" aria-hidden={!hero}>
          <span className="see-show-moment__gap-label">Gap</span>
          <strong>{gap != null ? `${gap}°` : '—'}</strong>
          <i />
        </div>

        <div className="see-show-moment__side see-show-moment__side--coach">
          <span className="see-show-moment__who">Coach</span>
          <div className="see-show-moment__arm" aria-hidden="true">
            <ArmSchematic
              schematic
              currentDeg={coachDeg}
              targetDeg={coachTarget}
              fromDeg={twin.intent?.from_deg}
              trail={twin.trail}
              markerId="see-show-coach-arrow"
            />
          </div>
          <strong className="see-show-moment__deg">{coachLabel}</strong>
        </div>
      </div>

      {hero ? (
        <p className="see-show-moment__narration" aria-live="polite">
          {narration}
        </p>
      ) : (
        <p className="see-show-moment__hint">Match the coach — close the gap.</p>
      )}
    </div>
  );
}

export default SeeShowMoment;
