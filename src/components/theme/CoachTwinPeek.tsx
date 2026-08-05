'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  coachStation,
  type StationCommandResultEvent,
  type StationDemonstrationEvent,
  type StationDemonstrationIntentV1,
  type StationRobotStateEvent,
  type StationTrajectoryProgressEvent,
  type StationStatus,
} from '@/services/coachStation';
import type { CoachPersonality } from '@/lib/coachPersonalities';
import '@/styles/coach-twin-peek.css';

function clampElbowDeg(deg: number): number {
  return Math.max(0, Math.min(180, deg));
}

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

type DemoBus = {
  connect: () => void;
  /** Tear down pending + looping timers. Optional — real station owns its socket. */
  disconnect?: () => void;
  onStatus: (fn: (s: StationStatus) => void) => () => void;
  onDemonstration: (fn: (e: StationDemonstrationEvent) => void) => () => void;
  onDemonstrationIntent: (fn: (e: StationDemonstrationIntentV1) => void) => () => void;
  onTrajectoryProgress: (fn: (e: StationTrajectoryProgressEvent) => void) => () => void;
  onRobotState: (fn: (e: StationRobotStateEvent) => void) => () => void;
  onCommandResult: (fn: (e: StationCommandResultEvent) => void) => () => void;
};

/**
 * Scripted demo bus for ?twin=1 — the instrument renders the full protocol
 * surface off synthetic events. Real station takes precedence when both are
 * configured; the demo never drives a real arm.
 */
function makeDemoBus(): DemoBus {
  type AnyListener = (e: never) => void;
  const listeners = new Map<string, Set<AnyListener>>();
  const add = (kind: string) => (fn: AnyListener) => {
    if (!listeners.has(kind)) listeners.set(kind, new Set());
    listeners.get(kind)!.add(fn);
    return () => listeners.get(kind)!.delete(fn);
  };
  const emit = (kind: string, payload: unknown) => {
    for (const fn of listeners.get(kind) ?? []) {
      try {
        fn(payload as never);
      } catch {
        // scripted demo must never break the app shell
      }
    }
  };

  const timers: number[] = [];
  let loopTimer: number | null = null;
  let stopped = false;
  const commandId = 'demo-cmd';

  const arm = (fn: () => void, ms: number) => {
    if (stopped) return;
    const id = window.setTimeout(() => {
      if (!stopped) fn();
    }, ms);
    timers.push(id);
  };

  const playSweep = () => {
    if (stopped) return;
    const personality: CoachPersonality = 'RASTA';
    const intent: StationDemonstrationIntentV1 = {
      type: 'demonstration_intent',
      version: '1.0',
      command_id: commandId,
      name: 'demonstrate_strict_curl',
      mode: 'curls',
      issue: 'elbow_swing',
      personality,
      joint: 'elbow_flex',
      from_deg: 160,
      to_deg: 50,
      speed_deg_s: 80,
      pause_s: 0.5,
      repeats: 2,
      narration: 'Elbow pinned — watch the dial.',
      duration_s: 4.2,
    };
    const demo: StationDemonstrationEvent = {
      type: 'demonstration',
      name: 'demonstrate_strict_curl',
      narration: 'Elbow pinned — watch the dial.',
      personality,
      duration_s: 4.2,
      issue: 'elbow_swing',
      mode: 'curls',
      command_id: commandId,
      version: '1.0',
    };

    emit('status', 'connected');
    emit('intent', intent);

    arm(() => {
      emit('robot_state', {
        type: 'robot_state',
        version: '1.0',
        status: 'executing',
        adapter: 'demo',
        affect: 'demo',
        command_id: commandId,
        detail: intent.name,
        updated_at_ms: Date.now(),
      } satisfies StationRobotStateEvent);
      emit('demonstration', demo);
    }, 900);

    const steps = 24;
    const durationMs = 4200;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const deg = 160 + (50 - 160) * t;
      const ms = 900 + (i / steps) * durationMs;
      arm(() => {
        emit('progress', {
          type: 'trajectory_progress',
          version: '1.0',
          command_id: commandId,
          joint: 'elbow_flex',
          current_deg: deg,
          progress_pct: t,
          timestamp_ms: Date.now(),
          measured_deg: deg,
        } satisfies StationTrajectoryProgressEvent);
      }, ms);
    }

    arm(
      () => {
        emit('command_result', {
          type: 'command_result',
          version: '1.0',
          command_id: commandId,
          status: 'succeeded',
          adapter: 'demo',
          affect: 'demo',
          duration_s: 4.2,
          completed_at_ms: Date.now(),
        } satisfies StationCommandResultEvent);
        emit('robot_state', {
          type: 'robot_state',
          version: '1.0',
          status: 'idle',
          adapter: 'demo',
          affect: 'demo',
          command_id: null,
          detail: null,
          updated_at_ms: Date.now(),
        } satisfies StationRobotStateEvent);
      },
      900 + durationMs + 400
    );
  };

  return {
    connect: () => {
      if (loopTimer !== null) return; // already running
      arm(playSweep, 600);
      loopTimer = window.setInterval(() => {
        if (!stopped) playSweep();
      }, 14000);
    },
    disconnect: () => {
      stopped = true;
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
      if (loopTimer !== null) {
        window.clearInterval(loopTimer);
        loopTimer = null;
      }
    },
    onStatus: add('status'),
    onDemonstration: add('demonstration'),
    onDemonstrationIntent: add('intent'),
    onTrajectoryProgress: add('progress'),
    onRobotState: add('robot_state'),
    onCommandResult: add('command_result'),
  };
}

/**
 * Read ?twin=1 from the URL. Kept query-side so a judge can drop `?twin=1`
 * onto any URL — no router integration, works in e2e and deep links alike.
 */
function isTwinDemoRequested(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('twin') === '1';
  } catch {
    return false;
  }
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
 */
export function CoachTwinPeek({
  showFallbackPulse = false,
  session = false,
}: {
  showFallbackPulse?: boolean;
  /** Rendered inside the active workout rather than the earned shell. */
  session?: boolean;
}) {
  const demoBusRef = useRef<DemoBus | null>(null);
  const isDemo = !coachStation.enabled && isTwinDemoRequested();
  if (isDemo && !demoBusRef.current) demoBusRef.current = makeDemoBus();
  const enabled = coachStation.enabled || isDemo;
  const [status, setStatus] = useState<StationStatus>(coachStation.status);
  const [demo, setDemo] = useState<StationDemonstrationEvent | null>(null);
  const [progress, setProgress] = useState<StationTrajectoryProgressEvent | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [intent, setIntent] = useState<StationDemonstrationIntentV1 | null>(null);
  const [affect, setAffect] = useState<string | null>(null);
  const [personality, setPersonality] = useState<CoachPersonality | null>(null);
  const [trail, setTrail] = useState<number[]>([]);
  const [booted, setBooted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const activeCommandIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const source: DemoBus = demoBusRef.current ?? coachStation;
    source.connect();
    let demoTimeout = 0;
    let executionTimeout = 0;
    let progressTimeout = 0;
    const bootTimeout = window.setTimeout(() => setBooted(true), 900);
    // Keep the telemetry-age label honest while the session panel is open:
    // without this tick it would freeze on "just now" the moment progress
    // stops. Session-only — the compact earned-shell twin has no age label.
    const ageTicker = session ? window.setInterval(() => setNow(Date.now()), 5000) : 0;

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

    const unsubStatus = source.onStatus((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus === 'offline') {
        resetInstrument();
        setAffect(null);
      }
    });
    const unsubIntent = source.onDemonstrationIntent((event) => {
      activeCommandIdRef.current = event.command_id;
      setIntent(event);
    });
    const unsubDemo = source.onDemonstration((event) => {
      if (event.command_id) activeCommandIdRef.current = event.command_id;
      window.clearTimeout(progressTimeout);
      setProgress(null);
      setTrail([]);
      setDemo(event);
      setPersonality(event.personality);
      window.clearTimeout(demoTimeout);
      demoTimeout = window.setTimeout(
        () => {
          setDemo(null);
          setTrail([]);
        },
        Math.max(2500, event.duration_s * 1000 || 3200)
      );
    });
    const unsubProgress = source.onTrajectoryProgress((event) => {
      if (!activeCommandIdRef.current || event.command_id !== activeCommandIdRef.current) return;
      window.clearTimeout(executionTimeout);
      window.clearTimeout(progressTimeout);
      setProgress(event);
      setTrail((current) => [...current.slice(-(TRAIL_LENGTH - 1)), event.current_deg]);
    });
    const unsubState = source.onRobotState((event: StationRobotStateEvent) => {
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
    const unsubResult = source.onCommandResult((event: StationCommandResultEvent) => {
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
      unsubIntent();
      unsubDemo();
      unsubProgress();
      unsubState();
      unsubResult();
      window.clearTimeout(demoTimeout);
      window.clearTimeout(executionTimeout);
      window.clearTimeout(progressTimeout);
      window.clearTimeout(bootTimeout);
      if (ageTicker) window.clearInterval(ageTicker);
      activeCommandIdRef.current = null;
      // Scripted demo owns its timers; clear them on unmount so the loop
      // doesn't leak into the earned shell (or worse, into an outing's
      // React tree).
      demoBusRef.current?.disconnect?.(); // scripted demo owns its timer queue
    };
    // `session` only gates the age ticker and never flips within a mount;
    // it's included so the effect's deps stay honest.
  }, [enabled, session]);

  if (!enabled) {
    return showFallbackPulse ? (
      <div className="coach-bay-pulse-fallback" aria-hidden="true" />
    ) : null;
  }

  // A configured but unreachable station should not turn into a persistent
  // error card. Return to the camera coaching surface quietly.
  if (status === 'offline') return null;

  const statusLabel =
    execution?.kind === 'succeeded'
      ? 'Correction complete'
      : execution?.kind === 'aborted' || execution?.kind === 'rejected'
        ? 'Correction stopped'
        : execution?.kind === 'error'
          ? 'Station error · coaching continues'
          : demo != null
            ? 'Demonstrating'
            : execution?.kind === 'executing'
              ? 'Executing correction'
              : intent != null
                ? 'Correction queued'
                : status === 'connected'
                  ? 'Coach standing by'
                  : status === 'connecting'
                    ? 'Connecting Coach…'
                    : 'Coach station offline · coaching continues';

  const isExecutionActive = execution?.kind === 'executing';
  const hasExecutionError = execution?.kind === 'error' || execution?.kind === 'aborted';
  const progressPct = progress ? Math.round(progress.progress_pct * 100) : null;
  const isShowingInstrument =
    demo != null || progress != null || execution?.kind === 'executing' || intent != null;
  // Idle-but-connected in a session: the coach is quietly watching the set.
  const isWatching = session && status === 'connected' && !isShowingInstrument;
  // Prefer encoder/sim-observed angle when the station can see it; fall back
  // to the commanded waypoint otherwise (console/silent backends).
  const observedElbowDeg = progress?.measured_deg;
  const currentElbowDeg =
    observedElbowDeg !== undefined
      ? observedElbowDeg
      : progress
        ? progress.current_deg
        : intent?.from_deg;
  // Ghost target comes from the executable intent (station truth) so it
  // persists while the arm is moving, not just while the demo banner is up.
  const targetElbowDeg = intent ? intent.to_deg : undefined;
  const currentForearmRotation =
    currentElbowDeg !== undefined ? elbowDegToForearmRotation(currentElbowDeg) : undefined;
  const targetForearmRotation =
    targetElbowDeg !== undefined ? elbowDegToForearmRotation(targetElbowDeg) : undefined;
  const showGhostTarget = isShowingInstrument && targetForearmRotation !== undefined;
  const rangeArc =
    showGhostTarget && intent && currentElbowDeg !== undefined
      ? buildRangeArc(intent.from_deg, clampElbowDeg(currentElbowDeg))
      : null;
  // The readout makes observed-vs-commanded legible, not hidden.
  const readoutLabel =
    currentElbowDeg !== undefined ? `${Math.round(clampElbowDeg(currentElbowDeg))}°` : null;
  const affectLabel =
    affect === 'live' ? 'LIVE' : affect === 'simulation' ? 'SIM' : isDemo ? 'DEMO' : null;
  const personaClass = personality ? ` persona-${personality.toLowerCase()}` : '';
  const activePhase =
    demo != null || progress != null || isExecutionActive || execution?.kind === 'succeeded'
      ? 'show'
      : intent != null
        ? 'coach'
        : 'see';
  const activeIssue = issueLabel(intent?.issue ?? demo?.issue);
  const telemetrySource = observedElbowDeg !== undefined ? 'Observed' : 'Commanded';
  const telemetryAgeLabel = formatTelemetryAge(progress?.timestamp_ms ?? null, now);

  return (
    <>
      <div
        className={`coach-twin-peek${session ? ' is-session' : ''} is-visible${booted ? ' is-booted' : ''}${demo ? ' is-demo' : ''}${progress ? ' is-progress' : ''}${isExecutionActive ? ' is-executing' : ''}${hasExecutionError ? ' is-error' : ''}${isShowingInstrument ? ' is-instrument' : ''}${isWatching ? ' is-watching' : ''}${personaClass}`}
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
          {session ? (
            <>
              <div className="coach-twin-peek__header">
                <div>
                  <p className="coach-twin-peek__eyebrow">Coach Bay</p>
                  <p className="coach-twin-peek__label">SO-101 · form instrument</p>
                </div>
                {affectLabel ? (
                  <span
                    className={`coach-twin-peek__affect${affect === 'live' ? ' is-live' : ''}`}
                    title={`Cyberwave affect: ${affect}`}
                  >
                    {affectLabel}
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
                  <span className="coach-twin-peek__issue-label">Form issue</span>
                  <strong>{activeIssue}</strong>
                  {demo?.narration || intent?.narration ? (
                    <span>{demo?.narration ?? intent?.narration}</span>
                  ) : null}
                </div>
              ) : null}

              {isShowingInstrument && targetElbowDeg !== undefined ? (
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
                  {execution.detail}
                </p>
              ) : null}
            </>
          ) : (
            <>
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
                  {demo.narration}
                </p>
              ) : execution ? (
                <p
                  className="coach-twin-peek__tip coach-twin-peek__tip--execution"
                  aria-live="polite"
                >
                  {execution.detail}
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
