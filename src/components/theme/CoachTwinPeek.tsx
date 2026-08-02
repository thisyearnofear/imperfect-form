'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  coachStation,
  type StationCommandResultEvent,
  type StationDemonstrationEvent,
  type StationRobotStateEvent,
  type StationTrajectoryProgressEvent,
  type StationStatus,
} from '@/services/coachStation';
import type { CoachPersonality } from '@/lib/coachPersonalities';
import '@/styles/coach-twin-peek.css';

/**
 * Elbow-space intent mirroring for the twin instrument.
 *
 * The station mirrors the physical intent as `DemonstrationIntentV1` events;
 * when a demo arrives the browser reconstructs the elbow sweep target so the
 * instrument shows where Coach is going, not just where it currently is.
 * Values map to the human-anatomy elbow angle: 0° is fully extended (arm
 * straight), 180° is fully flexed (curled) — Coach demos highlight the strict
 * curl, so the instrument mirrors that convention.
 */
export interface StationDemonstrationIntentV1 {
  type: 'demonstration_intent';
  version?: '1.0';
  command_id?: string;
  name: string;
  mode: string;
  issue: string;
  joint: 'elbow_flex';
  from_deg: number;
  to_deg: number;
  speed_deg_s: number;
  pause_s: number;
  repeats: number;
  narration: string;
  duration_s: number;
}

/**
 * Mirror the intent implied by a demo event. `to_deg=50` matches the
 * strict-curl primitive in coach-station/coach_station/primitives.py; once
 * the station broadcasts explicit `demonstration_intent` payloads this shim
 * can be replaced by a direct subscription.
 */
function deriveIntent(demo: StationDemonstrationEvent): StationDemonstrationIntentV1 {
  return {
    type: 'demonstration_intent',
    command_id: demo.command_id,
    name: demo.name,
    mode: demo.mode,
    issue: demo.issue,
    joint: 'elbow_flex',
    from_deg: clampElbowDeg(160),
    to_deg: clampElbowDeg(50),
    speed_deg_s: 45,
    pause_s: 1,
    repeats: 1,
    narration: demo.narration,
    duration_s: demo.duration_s,
  };
}

function clampElbowDeg(deg: number): number {
  return Math.max(0, Math.min(180, deg));
}

/**
 * Convert an elbow angle to the instrument's forearm SVG rotation.
 *
 * SVG rotate() is clockwise and the forearm path points screen-right at
 * rotation 0. The dial's 0° (extended) tick sits at the bottom of the gauge
 * and 180° (flexed) at the top-right. Mapping: rotation = 90 - deg puts 0°
 * forearm pointing down (extended) and 180° pointing up hard-left of vertical
 * is not what we want — dial geometry below is laid out around rotation =
 * 180 - deg so the limb visually folds upward as it curls, matching how the
 * persona demos read on a desk.
 */
function elbowDegToForearmRotation(elbowDeg: number): number {
  return 180 - clampElbowDeg(elbowDeg);
}

/** Dial tick marks every 30°, anchored to the same hub as the forearm. */
const DIAL_TICKS = [0, 30, 60, 90, 120, 150, 180].map((deg) => {
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

function polar(cx: number, cy: number, r: number, rotationDeg: number) {
  const rad = ((rotationDeg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

/** Curvature indicator from `from` toward the current elbow angle. */
function buildRangeArc(fromDeg: number, currentDeg: number): string | null {
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

/** Max forearm positions kept as the motion trail. */
const TRAIL_LENGTH = 5;

type Execution =
  | { kind: 'executing'; detail?: string | null }
  | { kind: 'succeeded'; detail: string }
  | { kind: 'aborted' | 'rejected' | 'error'; detail: string };

/**
 * Live twin instrument — visible only when NEXT_PUBLIC_COACH_STATION is set.
 * Fail-silent: offline is a quiet status, never an error.
 *
 * When idle it's a discreet status strip. When a demonstration runs it
 * expands into a small piece of Cyberwave-flavored mission control: a SIM /
 * LIVE badge straight from the station's `affect` field, an elbow dial with
 * real degree readout, ghost limb for the target pose, motion trail, and
 * persona-tinted energy — all rendered from real `trajectory_progress`
 * events. No MuJoCo embed; Cyberwave/console stay on the station machine.
 */
export function CoachTwinPeek({ showFallbackPulse = false }: { showFallbackPulse?: boolean }) {
  const enabled = coachStation.enabled;
  const [status, setStatus] = useState<StationStatus>(coachStation.status);
  const [demo, setDemo] = useState<StationDemonstrationEvent | null>(null);
  const [progress, setProgress] = useState<StationTrajectoryProgressEvent | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [intent, setIntent] = useState<StationDemonstrationIntentV1 | null>(null);
  const [affect, setAffect] = useState<string | null>(null);
  const [personality, setPersonality] = useState<CoachPersonality | null>(null);
  const [trail, setTrail] = useState<number[]>([]);
  const [booted, setBooted] = useState(false);
  const activeCommandIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    coachStation.connect();
    let demoTimeout = 0;
    let executionTimeout = 0;
    let progressTimeout = 0;
    const bootTimeout = window.setTimeout(() => setBooted(true), 900);

    const resetInstrument = () => {
      activeCommandIdRef.current = null;
      setDemo(null);
      setProgress(null);
      setExecution(null);
      setIntent(null);
      setTrail([]);
    };

    const clearExecutionLater = () => {
      window.clearTimeout(executionTimeout);
      executionTimeout = window.setTimeout(() => setExecution(null), 2800);
    };

    const unsubStatus = coachStation.onStatus((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus === 'offline') {
        resetInstrument();
        setAffect(null);
      }
    });
    const unsubDemo = coachStation.onDemonstration((event) => {
      if (event.command_id) activeCommandIdRef.current = event.command_id;
      window.clearTimeout(progressTimeout);
      setProgress(null);
      setTrail([]);
      setDemo(event);
      setPersonality(event.personality);
      setIntent(deriveIntent(event));
      window.clearTimeout(demoTimeout);
      demoTimeout = window.setTimeout(
        () => {
          setDemo(null);
          setIntent(null);
          setTrail([]);
        },
        Math.max(2500, event.duration_s * 1000 || 3200)
      );
    });
    const unsubProgress = coachStation.onTrajectoryProgress((event) => {
      if (!activeCommandIdRef.current || event.command_id !== activeCommandIdRef.current) return;
      window.clearTimeout(executionTimeout);
      window.clearTimeout(progressTimeout);
      setProgress(event);
      setTrail((current) => [...current.slice(-(TRAIL_LENGTH - 1)), event.current_deg]);
    });
    const unsubState = coachStation.onRobotState((event: StationRobotStateEvent) => {
      setAffect(event.affect);
      if (event.status === 'executing') {
        if (event.command_id) activeCommandIdRef.current = event.command_id;
        window.clearTimeout(executionTimeout);
        window.clearTimeout(progressTimeout);
        setProgress(null);
        setExecution({ kind: 'executing', detail: event.detail });
      } else if (event.status === 'error') {
        resetInstrument();
        setExecution({ kind: 'error', detail: event.detail || 'Station error' });
        clearExecutionLater();
      }
    });
    const unsubResult = coachStation.onCommandResult((event: StationCommandResultEvent) => {
      setAffect(event.affect);
      if (!activeCommandIdRef.current || event.command_id !== activeCommandIdRef.current) return;
      resetInstrument();
      const detail =
        event.status === 'succeeded' ? 'Move complete' : event.error || `Move ${event.status}`;
      setExecution({ kind: event.status, detail });
      clearExecutionLater();
      window.clearTimeout(progressTimeout);
      progressTimeout = window.setTimeout(() => setProgress(null), 2800);
    });

    return () => {
      unsubStatus();
      unsubDemo();
      unsubProgress();
      unsubState();
      unsubResult();
      window.clearTimeout(demoTimeout);
      window.clearTimeout(executionTimeout);
      window.clearTimeout(progressTimeout);
      window.clearTimeout(bootTimeout);
      activeCommandIdRef.current = null;
    };
  }, [enabled]);

  if (!enabled) {
    return showFallbackPulse ? (
      <div className="coach-bay-pulse-fallback" aria-hidden="true" />
    ) : null;
  }

  const statusLabel =
    execution?.kind === 'succeeded'
      ? 'Correction complete'
      : execution?.kind === 'aborted' || execution?.kind === 'rejected'
        ? 'Correction stopped'
        : execution?.kind === 'error'
          ? 'Station error'
          : demo != null
            ? 'Demonstrating'
            : execution?.kind === 'executing'
              ? 'Executing correction'
              : status === 'connected'
                ? 'Twin linked'
                : status === 'connecting'
                  ? 'Linking twin…'
                  : 'Station offline';

  const isExecutionActive = execution?.kind === 'executing';
  const hasExecutionError = execution?.kind === 'error' || execution?.kind === 'aborted';
  const progressPct = progress ? Math.round(progress.progress_pct * 100) : null;
  const isShowingInstrument = demo != null || progress != null || execution?.kind === 'executing';
  // Prefer encoder/sim-observed angle when the station can see it; fall back
  // to the commanded waypoint otherwise (console/silent backends).
  const observedElbowDeg = progress?.measured_deg;
  const currentElbowDeg =
    observedElbowDeg !== undefined
      ? observedElbowDeg
      : progress
        ? progress.current_deg
        : intent?.from_deg;
  const targetElbowDeg = demo && intent ? intent.to_deg : undefined;
  const currentForearmRotation =
    currentElbowDeg !== undefined ? elbowDegToForearmRotation(currentElbowDeg) : undefined;
  const targetForearmRotation =
    targetElbowDeg !== undefined ? elbowDegToForearmRotation(targetElbowDeg) : undefined;
  const showGhostTarget = isShowingInstrument && targetForearmRotation !== undefined;
  const rangeArc =
    showGhostTarget && intent && currentElbowDeg !== undefined
      ? buildRangeArc(intent.from_deg, clampElbowDeg(currentElbowDeg))
      : null;
  // The readout should make observed-vs-commanded legible, not hidden.
  const readoutLabel =
    observedElbowDeg !== undefined
      ? `${Math.round(clampElbowDeg(observedElbowDeg))}°`
      : currentElbowDeg !== undefined
        ? `${Math.round(clampElbowDeg(currentElbowDeg))}°`
        : null;
  const affectLabel = affect === 'live' ? 'LIVE' : affect ? 'SIM' : null;
  const personaClass = personality ? ` persona-${personality.toLowerCase()}` : '';

  return (
    <>
      <div
        className={`coach-twin-peek is-visible${booted ? ' is-booted' : ''}${demo ? ' is-demo' : ''}${progress ? ' is-progress' : ''}${isExecutionActive ? ' is-executing' : ''}${hasExecutionError ? ' is-error' : ''}${isShowingInstrument ? ' is-instrument' : ''}${personaClass}`}
        role="group"
        aria-label={demo ? `Coach demonstrating: ${demo.narration}` : statusLabel}
      >
        <div
          className={`coach-twin-peek__stage${isShowingInstrument ? ' is-schematic' : ''}`}
          aria-hidden="true"
        >
          {isShowingInstrument ? (
            <svg
              className="coach-twin-peek__arm coach-twin-peek__arm--schematic"
              viewBox="0 0 60 64"
              fill="none"
            >
              <defs>
                <marker
                  id="coach-twin-arrowhead"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
                </marker>
              </defs>

              {/* Dial face */}
              {DIAL_TICKS.map((tick) => (
                <line
                  key={tick.deg}
                  x1={tick.x1.toFixed(2)}
                  y1={tick.y1.toFixed(2)}
                  x2={tick.x2.toFixed(2)}
                  y2={tick.y2.toFixed(2)}
                  stroke="currentColor"
                  strokeWidth={tick.major ? 1.4 : 0.8}
                  opacity={tick.major ? 0.5 : 0.28}
                  strokeLinecap="round"
                />
              ))}

              {rangeArc != null ? (
                <path
                  className="coach-twin-peek__range-arc"
                  d={rangeArc}
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="3 5"
                  strokeLinecap="round"
                  opacity="0.45"
                  markerEnd="url(#coach-twin-arrowhead)"
                />
              ) : null}

              {/* Motion trail — fading echoes of recent forearm positions */}
              {trail.slice(0, -1).map((deg, index) => (
                <path
                  key={`trail-${index}-${deg.toFixed(1)}`}
                  className="coach-twin-peek__trail"
                  d="M18 44 H40"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity={0.06 + (index / trail.length) * 0.16}
                  style={{ transform: `rotate(${elbowDegToForearmRotation(deg)}deg)` }}
                />
              ))}

              {/* Shoulder + upper arm */}
              <circle
                cx="18"
                cy="52"
                r="4.6"
                stroke="currentColor"
                strokeWidth="1.8"
                opacity="0.5"
              />
              <path
                d="M18 48 V44"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.85"
              />

              {showGhostTarget && targetForearmRotation !== undefined ? (
                <g
                  className="coach-twin-peek__ghost-forearm"
                  style={{ transform: `rotate(${targetForearmRotation}deg)` }}
                >
                  <path
                    d="M18 44 H40"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeDasharray="2 4"
                    opacity="0.3"
                  />
                  <circle
                    cx="40"
                    cy="44"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    fill="none"
                    opacity="0.55"
                  />
                </g>
              ) : null}

              <g
                className="coach-twin-peek__forearm"
                style={
                  currentForearmRotation === undefined
                    ? undefined
                    : { transform: `rotate(${currentForearmRotation}deg)` }
                }
              >
                <path
                  d="M18 44 H40"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <circle cx="40" cy="44" r="3.2" fill="currentColor" opacity="0.9" />
              </g>
              <circle cx="18" cy="44" r="3.5" fill="currentColor" />
            </svg>
          ) : (
            <svg className="coach-twin-peek__arm" viewBox="0 0 52 52" fill="none">
              <circle cx="18" cy="38" r="5" stroke="currentColor" strokeWidth="2" opacity="0.55" />
              <path
                d="M18 33 V16"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.85"
              />
              <g
                className="coach-twin-peek__forearm"
                style={
                  currentForearmRotation === undefined
                    ? undefined
                    : { transform: `rotate(${currentForearmRotation}deg)` }
                }
              >
                <path
                  d="M18 28 H38"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <circle cx="38" cy="28" r="3.2" fill="currentColor" opacity="0.9" />
              </g>
              <circle cx="18" cy="28" r="3.5" fill="currentColor" />
            </svg>
          )}
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
          <div className="coach-twin-peek__header">
            <p className="coach-twin-peek__label">SO-101 twin</p>
            {affectLabel ? (
              <span
                className={`coach-twin-peek__affect${affect === 'live' ? ' is-live' : ''}`}
                title={`Cyberwave affect: ${affect}`}
              >
                {affectLabel}
              </span>
            ) : null}
          </div>
          <p
            className={`coach-twin-peek__status${status === 'offline' && !demo && !execution ? ' is-offline' : ''}`}
            aria-live="polite"
          >
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
              {demo.narration}
            </p>
          ) : execution ? (
            <p className="coach-twin-peek__tip coach-twin-peek__tip--execution" aria-live="polite">
              {execution.detail}
            </p>
          ) : null}
        </div>
      </div>
      {showFallbackPulse ? <div className="coach-bay-pulse-fallback" aria-hidden="true" /> : null}
    </>
  );
}

export default CoachTwinPeek;
