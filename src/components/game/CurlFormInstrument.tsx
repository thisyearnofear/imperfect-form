'use client';

import React, { useEffect, useState, useRef } from 'react';
import type { CurlTelemetry } from '@/types/mediapipe';
import { playStudioCue } from '@/lib/uiSound';
import { coachStation, type StationTrajectoryProgressEvent } from '@/services/coachStation';

interface CurlFormInstrumentProps {
  telemetry: CurlTelemetry | null;
  tracking: boolean;
  repCount?: number;
}

const phaseLabel: Record<NonNullable<CurlTelemetry>['phase'], string> = {
  extended: 'Start position',
  'mid-curl': 'Curl phase',
  'curl-range': 'Range reached',
};

function clampAngle(angle: number): number {
  return Math.max(0, Math.min(180, angle));
}

export function CurlFormInstrument({ telemetry, tracking, repCount = 0 }: CurlFormInstrumentProps) {
  // SO-101 robot elbow angle from station trajectory progress
  const [robotElbowDeg, setRobotElbowDeg] = useState<number | null>(null);
  const [robotMeasuredDeg, setRobotMeasuredDeg] = useState<number | null>(null);

  useEffect(() => {
    if (!coachStation.enabled) return;
    const unsub = coachStation.onTrajectoryProgress((event: StationTrajectoryProgressEvent) => {
      setRobotElbowDeg(event.current_deg);
      setRobotMeasuredDeg(event.measured_deg ?? null);
    });
    return () => unsub();
  }, []);

  const liveAngleBucket = telemetry ? Math.round(telemetry.elbowAngle / 10) * 10 : null;
  const telemetryPhase = telemetry?.phase;
  const telemetryTargetMin = telemetry?.targetMinDeg;
  const telemetryTargetMax = telemetry?.targetMaxDeg;
  const telemetryDrift = telemetry?.elbowDriftDeg;
  const telemetryDriftTarget = telemetry?.elbowDriftTargetDeg;
  const liveDriftOverTarget =
    telemetryDrift !== null && telemetryDrift !== undefined && telemetryDriftTarget !== undefined
      ? telemetryDrift > telemetryDriftTarget
      : null;
  const [accessibleStatus, setAccessibleStatus] = useState('Show one curl to begin.');
  const prevPhaseRef = useRef<CurlTelemetry['phase'] | null>(null);
  const [showPulse, setShowPulse] = useState(false);

  // Sound feedback on phase transitions
  useEffect(() => {
    if (!telemetry || !tracking) return;
    const prevPhase = prevPhaseRef.current;
    const currentPhase = telemetry.phase;

    if (prevPhase !== currentPhase) {
      if (currentPhase === 'curl-range') {
        // In target range — success sound
        playStudioCue('chime');
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 400);
      } else if (prevPhase === 'curl-range' && currentPhase === 'mid-curl') {
        // Left target range — soft feedback
        playStudioCue('soft');
      }
    }
    prevPhaseRef.current = currentPhase;
  }, [telemetry?.phase, tracking]);

  useEffect(() => {
    if (!tracking || !telemetry || liveAngleBucket === null) {
      setAccessibleStatus('Show one curl to begin.');
      return;
    }

    const driftMessage =
      liveDriftOverTarget === true
        ? ' Elbow drift is above the target.'
        : telemetryDrift === null || telemetryDrift === undefined
          ? ' Elbow drift is unavailable; keep hip and shoulder visible.'
          : ' Elbow drift is within the target.';
    setAccessibleStatus(
      `${phaseLabel[telemetryPhase ?? 'mid-curl']}. Elbow angle ${liveAngleBucket} degrees; target ${telemetryTargetMin ?? 50} to ${telemetryTargetMax ?? 70} degrees.${driftMessage}`
    );
  }, [
    liveAngleBucket,
    liveDriftOverTarget,
    telemetryDrift,
    telemetryDriftTarget,
    telemetryPhase,
    telemetryTargetMax,
    telemetryTargetMin,
    telemetry,
    tracking,
  ]);

  if (!tracking || !telemetry) {
    return (
      <section className="curl-instrument curl-instrument--waiting" aria-live="polite">
        <div>
          <p className="curl-instrument__eyebrow">Robot demo</p>
          <strong>Show one curl</strong>
          <span>The arm will mirror your elbow angle in real time.</span>
        </div>
        <div className="curl-instrument__waiting-mark" aria-hidden="true">
          ◌
        </div>
      </section>
    );
  }

  const angle = clampAngle(telemetry.elbowAngle);
  const targetMid = (telemetry.targetMinDeg + telemetry.targetMaxDeg) / 2;
  const anglePosition = `${(angle / 180) * 100}%`;
  const targetStart = `${(telemetry.targetMinDeg / 180) * 100}%`;
  const targetWidth = `${((telemetry.targetMaxDeg - telemetry.targetMinDeg) / 180) * 100}%`;
  const drift = telemetry.elbowDriftDeg;
  const driftDelta = drift === null ? null : Math.round(drift - telemetry.elbowDriftTargetDeg);
  const rangeReached = angle <= telemetry.targetMaxDeg;

  return (
    <section
      className={`curl-instrument curl-instrument--${telemetry.phase}`}
      aria-label="Live curl form instrument"
      role="region"
    >
      <span className="sr-only" aria-live="polite">
        {accessibleStatus}
      </span>
      <div className="curl-instrument__header">
        <div>
          <p className="curl-instrument__eyebrow">Robot demo</p>
          <strong>{phaseLabel[telemetry.phase]}</strong>
        </div>
        <span className="curl-instrument__rep">Match the arm</span>
      </div>

      <div className="curl-instrument__body">
        <div
          className={`curl-instrument__dial${showPulse ? ' curl-instrument__dial--pulse' : ''}`}
          aria-hidden="true"
        >
          <div className="curl-instrument__dial-ring" />
          {/* Animated target line — shows where the arm should be */}
          <div
            className="curl-instrument__target-line"
            style={{ transform: `rotate(${180 - targetMid}deg)` }}
          />
          <div
            className="curl-instrument__forearm"
            style={{ transform: `rotate(${180 - angle}deg)` }}
          >
            <span />
          </div>
          <div className="curl-instrument__hub" />
          <span className="curl-instrument__dial-label curl-instrument__dial-label--top">50°</span>
          <span className="curl-instrument__dial-label curl-instrument__dial-label--bottom">
            160°
          </span>
        </div>

        <div className="curl-instrument__readings">
          <div className="curl-instrument__reading curl-instrument__reading--primary">
            <span>Elbow angle</span>
            <strong>{Math.round(angle)}°</strong>
            <small>
              target {telemetry.targetMinDeg}–{telemetry.targetMaxDeg}°
            </small>
          </div>
          <div className="curl-instrument__reading">
            <span>Elbow drift</span>
            <strong>{drift === null ? '—' : `${Math.round(drift)}°`}</strong>
            <small>
              {drift === null
                ? 'keep hip + shoulder visible'
                : driftDelta !== null && driftDelta > 0
                  ? `${driftDelta}° over target`
                  : 'within target'}
            </small>
          </div>
        </div>
      </div>

      <div
        className="curl-instrument__range"
        aria-label={`Elbow angle ${Math.round(angle)} degrees, target ${telemetry.targetMinDeg} to ${telemetry.targetMaxDeg} degrees`}
      >
        <div className="curl-instrument__range-track">
          <span
            className="curl-instrument__range-target"
            style={{ left: targetStart, width: targetWidth }}
          />
          <span className="curl-instrument__range-marker" style={{ left: anglePosition }} />
        </div>
        <div className="curl-instrument__range-labels">
          <span>Extend</span>
          <span>
            {rangeReached
              ? 'In curl range ✓'
              : `${Math.max(0, Math.round(angle - targetMid))}° to target`}
          </span>
          <span>Curl</span>
        </div>
      </div>

      {/* SO-101 Robot Joint Readout */}
      {coachStation.enabled && (
        <div className="curl-instrument__robot">
          <div className="curl-instrument__robot-header">
            <span className="curl-instrument__robot-badge">SO-101</span>
            <span className="curl-instrument__robot-label">Robot elbow</span>
          </div>
          <div className="curl-instrument__robot-angles">
            <div className="curl-instrument__robot-angle">
              <span>Commanded</span>
              <strong>{robotElbowDeg !== null ? `${Math.round(robotElbowDeg)}°` : '—'}</strong>
            </div>
            <div className="curl-instrument__robot-angle">
              <span>Observed</span>
              <strong>
                {robotMeasuredDeg !== null ? `${Math.round(robotMeasuredDeg)}°` : '—'}
              </strong>
            </div>
            {telemetry && robotElbowDeg !== null && (
              <div className="curl-instrument__robot-angle curl-instrument__robot-angle--diff">
                <span>Delta</span>
                <strong>{Math.abs(Math.round(telemetry.elbowAngle - robotElbowDeg))}°</strong>
              </div>
            )}
          </div>
          <p className="curl-instrument__robot-tip">
            Match the robot's target angle with your elbow
          </p>
        </div>
      )}

      {/* Live form score */}
      {repCount > 0 && (
        <div className="curl-instrument__score">
          <span className="curl-instrument__score-label">Reps</span>
          <span className="curl-instrument__score-value">{repCount}</span>
          <span className="curl-instrument__score-divider">·</span>
          <span className="curl-instrument__score-label">Form</span>
          <span
            className={`curl-instrument__score-value${rangeReached ? ' curl-instrument__score-value--good' : ''}`}
          >
            {rangeReached ? '✓' : '—'}
          </span>
        </div>
      )}
    </section>
  );
}

export default CurlFormInstrument;
