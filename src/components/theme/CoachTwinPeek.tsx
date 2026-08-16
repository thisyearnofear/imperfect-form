'use client';

import React from 'react';
import type { StationStatus } from '@/services/coachStation';
import { ArmSchematic } from '@/components/game/ArmSchematic';
import {
  isTwinHeroActive,
  useCoachTwin,
  type CoachTwinState,
  type TwinExecution,
} from '@/hooks/useCoachTwin';
import { clampElbowDeg } from '@/lib/armSchematic';
import '@/styles/coach-twin-peek.css';

function issueLabel(issue?: string | null): string | null {
  if (!issue) return null;
  if (issue === 'elbow_swing') return 'Elbow drifting';
  return issue.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function phaseRankFor(phase: 'see' | 'coach' | 'show', active: 'see' | 'coach' | 'show'): number {
  return ['see', 'coach', 'show'].indexOf(phase) - ['see', 'coach', 'show'].indexOf(active);
}

function formatTelemetryAge(timestampMs: number | null, nowMs: number): string | null {
  if (timestampMs === null) return null;
  const ageSeconds = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
  if (ageSeconds < 5) return 'Updated just now';
  if (ageSeconds < 60) return `Updated ${ageSeconds}s ago`;
  return `Updated ${Math.floor(ageSeconds / 60)}m ago`;
}

function deriveTwinView(twin: CoachTwinState, session: boolean) {
  const {
    demo,
    progress,
    choreographyProgress,
    execution,
    intent,
    affect,
    personality,
    now,
    isDemo,
    isCurlsFormRef,
    status,
    skipped,
  } = twin;

  const isChoreography = demo?.choreography === true;
  const choreoLabel = choreographyProgress?.label ?? null;
  const choreoPct = choreographyProgress
    ? Math.round(choreographyProgress.progress_pct * 100)
    : null;

  const statusLabel =
    skipped != null
      ? 'Coach showed this recently — your turn'
      : execution?.kind === 'succeeded'
        ? 'Correction complete — your turn'
        : execution?.kind === 'aborted' || execution?.kind === 'rejected'
          ? 'Correction stopped'
          : execution?.kind === 'error'
            ? 'Station error · coaching continues'
            : demo != null && isChoreography
              ? choreoLabel
                ? `Coach is demonstrating: ${choreoLabel}`
                : 'Coach is performing the full movement'
              : demo != null
                ? isCurlsFormRef
                  ? 'Form reference — match the target line'
                  : 'Coach is showing the target line'
                : execution?.kind === 'executing'
                  ? isChoreography
                    ? 'Coach is demonstrating the correct form'
                    : isCurlsFormRef
                      ? 'Demonstrating the target angle'
                      : 'Coach is moving through the correction'
                  : intent != null
                    ? 'Coach is preparing the correction'
                    : status === 'connected'
                      ? 'Coach is watching your form'
                      : status === 'connecting'
                        ? 'Connecting Coach…'
                        : isCurlsFormRef
                          ? 'Watch the target — match it with your elbow'
                          : 'Coach Bay offline · camera coaching continues';

  const isExecutionActive = execution?.kind === 'executing';
  const hasExecutionError = execution?.kind === 'error' || execution?.kind === 'aborted';
  const progressPct = isChoreography
    ? choreoPct
    : progress
      ? Math.round(progress.progress_pct * 100)
      : null;
  const isShowingInstrument = isTwinHeroActive(twin);
  const isWatching = session && status === 'connected' && !isShowingInstrument;
  const observedElbowDeg = progress?.measured_deg;
  const currentElbowDeg =
    observedElbowDeg !== undefined
      ? observedElbowDeg
      : progress
        ? progress.current_deg
        : intent?.from_deg;
  const targetElbowDeg = intent ? intent.to_deg : undefined;
  const showGhostTarget = isShowingInstrument && targetElbowDeg !== undefined && !isChoreography;
  const readoutLabel =
    isChoreography && choreoPct !== null
      ? `${choreoPct}%`
      : currentElbowDeg !== undefined
        ? `${Math.round(clampElbowDeg(currentElbowDeg))}°`
        : null;
  const affectLabel =
    affect === 'live' ? 'LIVE' : affect === 'simulation' ? 'SIM' : isDemo ? 'DEMO' : null;
  const personaClass = personality ? ` persona-${personality.toLowerCase()}` : '';
  const activePhase: 'see' | 'coach' | 'show' =
    demo != null ||
    progress != null ||
    choreographyProgress != null ||
    isExecutionActive ||
    execution?.kind === 'succeeded'
      ? 'show'
      : intent != null
        ? 'coach'
        : 'see';
  const activeIssue = issueLabel(intent?.issue ?? demo?.issue);
  const telemetrySource = observedElbowDeg !== undefined ? 'Observed' : 'Commanded';
  const telemetryAgeLabel = formatTelemetryAge(
    progress?.timestamp_ms ?? choreographyProgress?.timestamp_ms ?? null,
    now
  );

  return {
    statusLabel,
    isExecutionActive,
    hasExecutionError,
    progressPct,
    isShowingInstrument,
    isWatching,
    observedElbowDeg,
    currentElbowDeg,
    targetElbowDeg,
    showGhostTarget,
    readoutLabel,
    affectLabel,
    personaClass,
    activePhase,
    activeIssue,
    telemetrySource,
    telemetryAgeLabel,
    fromDeg: intent?.from_deg,
    isChoreography,
    choreoLabel,
    choreoPct,
  };
}

/**
 * Live twin instrument — visible when NEXT_PUBLIC_COACH_STATION is set or
 * when the URL carries `?twin=1` (scripted demo, `DEMO` badge).
 * Fail-silent: offline is a quiet status, never an error.
 *
 * When idle it's a discreet status strip. The ghost target and range arc come
 * from the executable `demonstration_intent` broadcast (station truth), not
 * the demo banner; the readout prefers observed angle from
 * `trajectory_progress.measured_deg` and falls back to commanded otherwise.
 * SIM / LIVE / DEMO badge reflects the station's `affect` field. All rendering
 * is fail-silent: MuJoCo/console stay on the station machine.
 *
 * During a see→show hero moment the peek yields the stage (`suppressed`) so
 * the juxtaposition overlay can be the only arm on screen.
 */
export function CoachTwinPeek({
  showFallbackPulse = false,
  session = false,
  mode,
  twin: twinProp,
  suppressed = false,
}: {
  showFallbackPulse?: boolean;
  /** Rendered inside the active workout rather than the earned shell. */
  session?: boolean;
  /** Exercise mode — when 'curls' and no station is connected, show the simulated arm as a form reference. */
  mode?: string;
  /** Parent-owned subscription (GameCanvas) so peek and overlay stay in lockstep. */
  twin?: CoachTwinState;
  /** Hide the widget while the cinematic demonstration owns the stage. */
  suppressed?: boolean;
}) {
  const localTwin = useCoachTwin({ session, mode, subscribe: !twinProp });
  const twin = twinProp ?? localTwin;
  const enabled = twin.enabled;
  const status: StationStatus = twin.status;
  const demo = twin.demo;
  const progress = twin.progress;
  const execution: TwinExecution | null = twin.execution;
  const isDemo = twin.isDemo;
  const isCurlsFormRef = twin.isCurlsFormRef;
  const view = deriveTwinView(twin, session);

  if (suppressed) {
    return showFallbackPulse ? (
      <div className="coach-bay-pulse-fallback" aria-hidden="true" />
    ) : null;
  }

  if (!enabled) {
    return showFallbackPulse ? (
      <div className="coach-bay-pulse-fallback" aria-hidden="true" />
    ) : null;
  }

  if (status === 'offline' && !session) return null;

  const {
    statusLabel,
    isExecutionActive,
    hasExecutionError,
    progressPct,
    isShowingInstrument,
    isWatching,
    observedElbowDeg,
    currentElbowDeg,
    targetElbowDeg,
    showGhostTarget,
    readoutLabel,
    affectLabel,
    personaClass,
    activePhase,
    activeIssue,
    telemetrySource,
    telemetryAgeLabel,
    fromDeg,
    isChoreography,
    choreoLabel,
    choreoPct,
  } = view;

  return (
    <>
      <div
        className={`coach-twin-peek${session ? ' is-session' : ''} is-visible${twin.booted ? ' is-booted' : ''}${demo ? ' is-demo' : ''}${progress ? ' is-progress' : ''}${isExecutionActive ? ' is-executing' : ''}${hasExecutionError ? ' is-error' : ''}${isShowingInstrument ? ' is-instrument' : ''}${isWatching ? ' is-watching' : ''}${personaClass}`}
        role="group"
        aria-label={demo ? `Coach demonstrating: ${demo.narration}` : statusLabel}
      >
        <div
          className={`coach-twin-peek__stage${isShowingInstrument ? ' is-schematic' : ''}`}
          aria-hidden="true"
        >
          <ArmSchematic
            schematic={isShowingInstrument}
            currentDeg={currentElbowDeg}
            targetDeg={showGhostTarget ? targetElbowDeg : undefined}
            fromDeg={fromDeg}
            trail={twin.trail}
            markerId="coach-twin-arrowhead"
          />
          {isShowingInstrument && readoutLabel !== null ? (
            <span
              className={`coach-twin-peek__readout${observedElbowDeg !== undefined ? ' is-observed' : ''}`}
              title={
                observedElbowDeg !== undefined
                  ? 'Observed joint angle (encoder/sim)'
                  : 'Commanded waypoint'
              }
            >
              {readoutLabel}
              {observedElbowDeg !== undefined ? '·obs' : ''}
            </span>
          ) : null}
          {showGhostTarget ? (
            <span className="coach-twin-peek__target-chip">
              → {Math.round(targetElbowDeg ?? 0)}°
            </span>
          ) : null}
        </div>
        <div className="coach-twin-peek__copy">
          {session ? (
            <>
              <div className="coach-twin-peek__header">
                <div>
                  <p className="coach-twin-peek__eyebrow">
                    {isCurlsFormRef ? 'Form Reference' : 'Coach Bay'}
                  </p>
                  <p className="coach-twin-peek__label">
                    {isCurlsFormRef ? 'Target angle guide · SO-101' : 'SO-101 · form instrument'}
                  </p>
                </div>
                {affectLabel ? (
                  <span
                    className={`coach-twin-peek__affect${twin.affect === 'live' ? ' is-live' : ''}`}
                    title={`Cyberwave affect: ${twin.affect}`}
                  >
                    {affectLabel}
                  </span>
                ) : isDemo ? (
                  <span className="coach-twin-peek__affect" title="Powered by Cyberwave">
                    via Cyberwave
                  </span>
                ) : null}
              </div>

              <ol className="coach-twin-peek__phases" aria-label="Coaching sequence">
                {(['see', 'coach', 'show'] as const).map((phase) => (
                  <li
                    key={phase}
                    className={
                      phase === activePhase
                        ? 'is-active'
                        : phaseRankFor(phase, activePhase) < 0
                          ? 'is-complete'
                          : ''
                    }
                  >
                    <span aria-hidden="true" />
                    {phase}
                  </li>
                ))}
              </ol>

              <p className="coach-twin-peek__status" aria-live="polite">
                {statusLabel}
              </p>

              {activeIssue ? (
                <div className="coach-twin-peek__issue">
                  <span className="coach-twin-peek__issue-label">
                    {isChoreography ? 'Detected' : 'Form issue'}
                  </span>
                  <strong>{activeIssue}</strong>
                  {demo?.narration || twin.intent?.narration ? (
                    <span>{demo?.narration ?? twin.intent?.narration}</span>
                  ) : null}
                </div>
              ) : null}

              {isChoreography && isShowingInstrument ? (
                <div className="coach-twin-peek__choreography" aria-label="Robot demonstration">
                  {choreoLabel ? (
                    <p className="coach-twin-peek__choreo-step">
                      <span className="coach-twin-peek__choreo-step-label">Robot is doing:</span>
                      <strong>{choreoLabel}</strong>
                    </p>
                  ) : null}
                  {demo?.description ? (
                    <p className="coach-twin-peek__choreo-desc">{demo.description}</p>
                  ) : null}
                </div>
              ) : null}

              {isShowingInstrument && !isChoreography && targetElbowDeg !== undefined ? (
                <div className="coach-twin-peek__telemetry" aria-label="Correction telemetry">
                  <div>
                    <span>Target</span>
                    <strong>{Math.round(targetElbowDeg)}°</strong>
                  </div>
                  <div className={observedElbowDeg !== undefined ? 'is-observed' : ''}>
                    <span>{telemetrySource}</span>
                    <strong>
                      {currentElbowDeg !== undefined ? `${Math.round(currentElbowDeg)}°` : '—'}
                    </strong>
                  </div>
                  {telemetryAgeLabel ? <small>{telemetryAgeLabel}</small> : null}
                </div>
              ) : null}

              {progressPct !== null ? (
                <div
                  className="coach-twin-peek__progress"
                  role="progressbar"
                  aria-label="Coach correction progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPct}
                >
                  <span className="coach-twin-peek__progress-track">
                    <span
                      className="coach-twin-peek__progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </span>
                  <span className="coach-twin-peek__progress-value">{progressPct}%</span>
                </div>
              ) : null}

              {execution && !activeIssue ? (
                <p
                  className="coach-twin-peek__tip coach-twin-peek__tip--execution"
                  aria-live="polite"
                >
                  {execution.detail === 'Move complete'
                    ? 'Your turn — match the line.'
                    : execution.detail}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div className="coach-twin-peek__header">
                <p className="coach-twin-peek__label">SO-101 twin</p>
                {affectLabel ? (
                  <span
                    className={`coach-twin-peek__affect${twin.affect === 'live' ? ' is-live' : ''}`}
                    title={`Cyberwave affect: ${twin.affect}`}
                  >
                    {affectLabel}
                  </span>
                ) : isDemo ? (
                  <span className="coach-twin-peek__affect" title="Powered by Cyberwave">
                    via Cyberwave
                  </span>
                ) : null}
              </div>
              <p className="coach-twin-peek__status" aria-live="polite">
                {statusLabel}
              </p>
              {progressPct !== null ? (
                <div
                  className="coach-twin-peek__progress"
                  role="progressbar"
                  aria-label="Coach correction progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPct}
                >
                  <span className="coach-twin-peek__progress-track">
                    <span
                      className="coach-twin-peek__progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </span>
                  <span className="coach-twin-peek__progress-value">{progressPct}%</span>
                </div>
              ) : null}
              {demo ? (
                <p className="coach-twin-peek__tip" aria-live="polite">
                  {isCurlsFormRef
                    ? 'Match the target angle with your elbow during the curl.'
                    : demo.narration}
                </p>
              ) : execution ? (
                <p
                  className="coach-twin-peek__tip coach-twin-peek__tip--execution"
                  aria-live="polite"
                >
                  {execution.detail === 'Move complete'
                    ? 'Your turn — match the line.'
                    : execution.detail}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
      {showFallbackPulse ? <div className="coach-bay-pulse-fallback" aria-hidden="true" /> : null}
    </>
  );
}

export default CoachTwinPeek;
