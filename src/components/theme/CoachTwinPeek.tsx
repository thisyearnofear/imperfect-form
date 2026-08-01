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
import '@/styles/coach-twin-peek.css';

/**
 * Live twin peek — visible only when NEXT_PUBLIC_COACH_STATION is set.
 * Fail-silent: offline is a quiet status, never an error. During station
 * `demonstration` events, the silhouette curls so physical AI is felt in-UI
 * (no MuJoCo embed — Cyberwave/console stay on the station machine).
 */
export function CoachTwinPeek({ showFallbackPulse = false }: { showFallbackPulse?: boolean }) {
  const enabled = coachStation.enabled;
  const [status, setStatus] = useState<StationStatus>(coachStation.status);
  const [demo, setDemo] = useState<StationDemonstrationEvent | null>(null);
  const [progress, setProgress] = useState<StationTrajectoryProgressEvent | null>(null);
  const [execution, setExecution] = useState<
    | { kind: 'executing'; detail?: string | null }
    | { kind: 'succeeded'; detail: string }
    | { kind: 'aborted' | 'rejected' | 'error'; detail: string }
    | null
  >(null);
  const activeCommandIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    coachStation.connect();
    let demoTimeout = 0;
    let executionTimeout = 0;
    let progressTimeout = 0;

    const clearExecutionLater = () => {
      window.clearTimeout(executionTimeout);
      executionTimeout = window.setTimeout(() => setExecution(null), 2800);
    };

    const unsubStatus = coachStation.onStatus((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus === 'offline') {
        activeCommandIdRef.current = null;
        setDemo(null);
        setProgress(null);
        setExecution(null);
      }
    });
    const unsubDemo = coachStation.onDemonstration((event) => {
      if (event.command_id) activeCommandIdRef.current = event.command_id;
      window.clearTimeout(progressTimeout);
      setProgress(null);
      setDemo(event);
      window.clearTimeout(demoTimeout);
      demoTimeout = window.setTimeout(
        () => setDemo(null),
        Math.max(2500, event.duration_s * 1000 || 3200)
      );
    });
    const unsubProgress = coachStation.onTrajectoryProgress((event) => {
      if (!activeCommandIdRef.current || event.command_id !== activeCommandIdRef.current) return;
      window.clearTimeout(executionTimeout);
      window.clearTimeout(progressTimeout);
      setProgress(event);
    });
    const unsubState = coachStation.onRobotState((event: StationRobotStateEvent) => {
      if (event.status === 'executing') {
        if (event.command_id) activeCommandIdRef.current = event.command_id;
        window.clearTimeout(executionTimeout);
        window.clearTimeout(progressTimeout);
        setProgress(null);
        setExecution({ kind: 'executing', detail: event.detail });
      } else if (event.status === 'error') {
        activeCommandIdRef.current = null;
        setDemo(null);
        setProgress(null);
        setExecution({ kind: 'error', detail: event.detail || 'Station error' });
        clearExecutionLater();
      }
    });
    const unsubResult = coachStation.onCommandResult((event: StationCommandResultEvent) => {
      if (!activeCommandIdRef.current || event.command_id !== activeCommandIdRef.current) return;
      activeCommandIdRef.current = null;
      setDemo(null);
      setProgress(null);
      const detail =
        event.status === 'succeeded'
          ? 'Move complete'
          : event.error || `Move ${event.status}`;
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
  const forearmRotation = progress
    ? -8 + Math.max(0, Math.min(180, progress.current_deg)) / 180 * 50
    : undefined;

  return (
    <>
      <div
        className={`coach-twin-peek is-visible${demo ? ' is-demo' : ''}${progress ? ' is-progress' : ''}${isExecutionActive ? ' is-executing' : ''}${hasExecutionError ? ' is-error' : ''}`}
        role="group"
        aria-label={demo ? `Coach demonstrating: ${demo.narration}` : statusLabel}
      >
        <div className="coach-twin-peek__stage" aria-hidden="true">
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
              style={forearmRotation === undefined ? undefined : { transform: `rotate(${forearmRotation}deg)` }}
            >
              <path d="M18 28 H38" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="38" cy="28" r="3.2" fill="currentColor" opacity="0.9" />
            </g>
            <circle cx="18" cy="28" r="3.5" fill="currentColor" />
          </svg>
        </div>
        <div className="coach-twin-peek__copy">
          <p className="coach-twin-peek__label">SO-101 twin</p>
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
            <p
              className="coach-twin-peek__tip coach-twin-peek__tip--execution"
              aria-live="polite"
            >
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
