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
  /** Desktop bay rail stays mounted; overlay is the mobile camera card. */
  placement?: 'overlay' | 'rail';
};

/**
 * The pitch visual: user's arm and the coach's arm on the same instrument,
 * with the gap between them as the thing to close.
 *
 * Overlay: dock in a corner, hero as a centered overlay while the arm sweeps.
 * Rail: always mounted beside the camera — hero is a highlight, not a cover.
 */
export function SeeShowMoment({
  twin,
  userElbowDeg,
  yieldToFirstSignal = false,
  placement = 'overlay',
}: SeeShowMomentProps) {
  const rail = placement === 'rail';
  const hasUser = userElbowDeg != null && Number.isFinite(userElbowDeg);
  if (!rail && !hasUser && !twin.enabled) return null;
  if (!rail && yieldToFirstSignal) return null;

  const isChoreography = twin.demo?.choreography === true;
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
  const choreoLabel = twin.choreographyProgress?.label ?? null;
  const choreoPct = twin.choreographyProgress
    ? Math.round(twin.choreographyProgress.progress_pct * 100)
    : null;
  const narration =
    isChoreography && choreoLabel
      ? choreoLabel
      : (twin.demo?.narration ??
        twin.intent?.narration ??
        (hero ? 'Watch the arm — then match the sweep.' : BRAND.loopLabel));
  const userLabel = userDeg != null ? `${Math.round(userDeg)}°` : '—';
  const coachLabel =
    isChoreography && choreoPct !== null
      ? `${choreoPct}%`
      : `${Math.round(clampElbowDeg(coachDeg))}°`;

  if (!rail && !hero && !hasUser) return null;

  return (
    <div
      className={`see-show-moment${hero ? ' is-hero' : ' is-dock'}${rail ? ' see-show-moment--spine' : ''}${rail && yieldToFirstSignal ? ' is-yield' : ''}${rail && !hasUser ? ' is-waiting' : ''}${isChoreography ? ' is-choreography' : ''}`}
      role="group"
      aria-label={
        isChoreography
          ? `Coach demonstrating: ${twin.demo?.description ?? 'full movement'}`
          : gap != null
            ? `Your elbow ${userLabel}, coach ${coachLabel}, gap ${gap} degrees`
            : `Coach arm ${coachLabel}`
      }
    >
      <p className="see-show-moment__eyebrow">
        {isChoreography ? 'COACH IS DEMONSTRATING' : hero ? 'WATCH THE GAP' : 'YOU · COACH'}
      </p>

      {isChoreography && hero ? (
        <div className="see-show-moment__choreo">
          <p className="see-show-moment__choreo-what">
            <strong>
              {twin.demo?.issue === 'elbow_swing'
                ? 'Elbow drifting detected'
                : (twin.demo?.issue ?? 'Form issue detected')}
            </strong>
            <span>Robot is showing the correct form</span>
          </p>
          {choreoPct !== null ? (
            <div className="see-show-moment__choreo-bar">
              <span style={{ width: `${choreoPct}%` }} />
              <small>{choreoPct}%</small>
            </div>
          ) : null}
          {choreoLabel ? <p className="see-show-moment__choreo-label">{choreoLabel}</p> : null}
        </div>
      ) : (
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
            <span className="see-show-moment__who">{twin.isDemo ? 'Coach · sim' : 'Coach'}</span>
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
      )}

      {hero ? (
        <p className="see-show-moment__narration" aria-live="polite">
          {narration}
        </p>
      ) : rail ? null : (
        <p className="see-show-moment__hint">Match the coach — close the gap.</p>
      )}
    </div>
  );
}

export default SeeShowMoment;
