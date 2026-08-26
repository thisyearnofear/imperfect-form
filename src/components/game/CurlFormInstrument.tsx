'use client';

import React, { useEffect, useState, useRef } from 'react';
import '@/styles/curl-instrument.css';
import type { CurlTelemetry } from '@/types/mediapipe';
import { playStudioCue } from '@/lib/uiSound';
import { coachStation, type StationTrajectoryProgressEvent } from '@/services/coachStation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import {
  COACH_PERSONALITIES,
  type CoachPersonality,
  getPersonalityFeedback,
} from '@/lib/coachPersonalities';
import { useCoachPersonality } from '@/hooks/useCoachPersonality';
import { getFormGrade } from '@/lib/formGrade';

interface CurlFormInstrumentProps {
  telemetry: CurlTelemetry | null;
  tracking: boolean;
  repCount?: number;
  onFormScore?: (score: number) => void;
  /** Overlay collapses off-camera; rail stays mounted beside the viewport. */
  layout?: 'overlay' | 'rail';
}

const phaseLabel: Record<NonNullable<CurlTelemetry>['phase'], string> = {
  extended: 'Start position',
  'mid-curl': 'Curl phase',
  'curl-range': 'Range reached',
};

function clampAngle(angle: number): number {
  return Math.max(0, Math.min(180, angle));
}

/**
 * Calculate form score (0-100) based on how well user matches robot target.
 * Factors: delta from target, drift penalty, range bonus.
 */
function calculateFormScore(
  userAngle: number,
  targetAngle: number | null,
  driftDeg: number | null,
  driftTarget: number | null,
  inRange: boolean
): number {
  if (targetAngle === null) return 0;

  // Base score from angle delta (0° delta = 100, 30°+ delta = 0)
  const delta = Math.abs(userAngle - targetAngle);
  const deltaScore = Math.max(0, 100 - (delta / 30) * 100);

  // Drift penalty (if available)
  let driftPenalty = 0;
  if (driftDeg !== null && driftTarget !== null && driftDeg > driftTarget) {
    const driftExcess = driftDeg - driftTarget;
    driftPenalty = Math.min(20, (driftExcess / 15) * 20);
  }

  // Range bonus
  const rangeBonus = inRange ? 10 : 0;

  return Math.round(Math.max(0, Math.min(100, deltaScore - driftPenalty + rangeBonus)));
}

interface ScoreEntry {
  rep: number;
  score: number;
  timestamp: number;
}

export function CurlFormInstrument({
  telemetry,
  tracking,
  repCount = 0,
  onFormScore,
  layout = 'overlay',
}: CurlFormInstrumentProps) {
  // Haptic feedback
  const { triggerCoachHaptic } = useHapticFeedback();

  // Current coach personality
  const [currentPersonality, setPersonality] = useCoachPersonality();

  // SO-101 robot elbow angle from station trajectory progress
  const [robotElbowDeg, setRobotElbowDeg] = useState<number | null>(null);
  const [robotMeasuredDeg, setRobotMeasuredDeg] = useState<number | null>(null);

  // Score history for tracking improvement
  const [scoreHistory, setScoreHistory] = useState<ScoreEntry[]>([]);
  const prevRepCountRef = useRef(repCount);
  const [currentGrade, setCurrentGrade] = useState<string | null>(null);
  const prevGradeRef = useRef<string | null>(null);
  // Only report a form score upward when it actually changes. telemetry is a
  // fresh object on every pose publish and onFormScore must not be invoked
  // with the same value repeatedly — that would re-render the parent, which
  // recreates the inline onFormScore, which re-fires this effect (infinite
  // "Maximum update depth exceeded" loop).
  const lastReportedScoreRef = useRef<number | null>(null);
  const lastTelemetryRef = useRef<CurlTelemetry | null>(telemetry);
  if (telemetry) lastTelemetryRef.current = telemetry;
  const displayTelemetry = telemetry ?? (layout === 'rail' ? lastTelemetryRef.current : null);
  // Progressive disclosure: the instrument can collapse to a compact status
  // strip so the camera feed stays visible mid-set. Default expanded.
  const [collapsed, setCollapsed] = useState(false);

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

  // Store score when rep completes (must be before early return)
  useEffect(() => {
    if (repCount > prevRepCountRef.current && repCount > 0 && telemetry) {
      // Rep just completed - store the score
      const angle = clampAngle(telemetry.elbowAngle);
      const targetMid = (telemetry.targetMinDeg + telemetry.targetMaxDeg) / 2;
      const targetAngle = robotElbowDeg ?? targetMid;
      const score = calculateFormScore(
        angle,
        targetAngle,
        telemetry.elbowDriftDeg,
        telemetry.elbowDriftTargetDeg,
        angle <= telemetry.targetMaxDeg
      );
      setScoreHistory((prev) => [
        ...prev.slice(-9), // Keep last 10 reps
        { rep: repCount, score, timestamp: Date.now() },
      ]);
      // Coach-specific haptic feedback for rep completion
      triggerCoachHaptic(currentPersonality, 'rep');
    }
    prevRepCountRef.current = repCount;
  }, [repCount, telemetry, robotElbowDeg, triggerCoachHaptic, currentPersonality]);

  // Calculate grade and form score from telemetry (must be before early return)
  useEffect(() => {
    if (!tracking || !telemetry) {
      setCurrentGrade(null);
      lastReportedScoreRef.current = null;
      return;
    }
    const angle = clampAngle(telemetry.elbowAngle);
    const targetMid = (telemetry.targetMinDeg + telemetry.targetMaxDeg) / 2;
    const targetAngle = robotElbowDeg ?? targetMid;
    const rangeReached = angle <= telemetry.targetMaxDeg;
    const score = calculateFormScore(
      angle,
      targetAngle,
      telemetry.elbowDriftDeg,
      telemetry.elbowDriftTargetDeg,
      rangeReached
    );
    const { grade } = getFormGrade(score);
    setCurrentGrade(grade);
    if (onFormScore && score !== lastReportedScoreRef.current) {
      lastReportedScoreRef.current = score;
      onFormScore(score);
    }
  }, [tracking, telemetry, robotElbowDeg, onFormScore]);

  // Haptic feedback on grade change (must be before early return)
  useEffect(() => {
    if (!tracking || !telemetry || currentGrade === null) return;
    const prevGrade = prevGradeRef.current;
    if (prevGrade !== null && prevGrade !== currentGrade) {
      // Grade changed - trigger coach-specific haptic feedback
      const gradeOrder = ['F', 'D', 'C', 'B', 'A'];
      const prevIndex = gradeOrder.indexOf(prevGrade);
      const newIndex = gradeOrder.indexOf(currentGrade);
      const improved = newIndex > prevIndex;

      if (improved) {
        // Improving - success feedback
        triggerCoachHaptic(currentPersonality, 'success');
      } else {
        // Declining - error feedback
        triggerCoachHaptic(currentPersonality, 'error');
      }
    }
    prevGradeRef.current = currentGrade;
  }, [currentGrade, tracking, telemetry, triggerCoachHaptic, currentPersonality]);

  if (layout !== 'rail' && (!tracking || !telemetry)) {
    // Progressive disclosure: before a curl is active (framing or between
    // reps), collapse to a one-line "form score" pill so the camera stays the
    // hero. The full dial + instrument only expands once a curl is measured.
    const lastScore = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].score : null;
    const lastGrade = lastScore !== null ? getFormGrade(lastScore) : null;
    return (
      <section
        className="curl-instrument curl-instrument--waiting curl-instrument--pill"
        aria-live="polite"
      >
        <div className="curl-instrument__pill-text">
          <p className="curl-instrument__eyebrow">Robot demo</p>
          <strong>{lastScore !== null ? `Form score ${lastScore}/100` : 'Show one curl'}</strong>
        </div>
        {lastGrade ? (
          <span className="curl-instrument__pill-grade" style={{ color: lastGrade.color }}>
            {lastGrade.grade}
          </span>
        ) : (
          <div className="curl-instrument__waiting-mark" aria-hidden="true">
            ◌
          </div>
        )}
      </section>
    );
  }

  if (!displayTelemetry) {
    return (
      <section className="curl-instrument curl-instrument--waiting" aria-live="polite">
        <div className="curl-instrument__header">
          <div>
            <p className="curl-instrument__eyebrow">Robot demo</p>
            <strong>Show one curl</strong>
          </div>
        </div>
        <div className="curl-instrument__body">
          <div className="curl-instrument__dial" aria-hidden="true">
            <div className="curl-instrument__dial-ring" />
            <div className="curl-instrument__hub" />
          </div>
          <div className="curl-instrument__readings">
            <div className="curl-instrument__reading curl-instrument__reading--primary">
              <span>Elbow</span>
              <strong>—</strong>
            </div>
            <div className="curl-instrument__reading">
              <span>Target</span>
              <strong>50–70°</strong>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const angle = clampAngle(displayTelemetry.elbowAngle);
  const targetMid = (displayTelemetry.targetMinDeg + displayTelemetry.targetMaxDeg) / 2;
  const anglePosition = `${(angle / 180) * 100}%`;
  const targetStart = `${(displayTelemetry.targetMinDeg / 180) * 100}%`;
  const targetWidth = `${((displayTelemetry.targetMaxDeg - displayTelemetry.targetMinDeg) / 180) * 100}%`;
  const drift = displayTelemetry.elbowDriftDeg;
  const driftDelta =
    drift === null ? null : Math.round(drift - displayTelemetry.elbowDriftTargetDeg);
  const rangeReached = angle <= displayTelemetry.targetMaxDeg;

  // Calculate live form score
  const targetAngle = robotElbowDeg ?? targetMid;
  const formScore = calculateFormScore(
    angle,
    targetAngle,
    drift,
    displayTelemetry.elbowDriftTargetDeg,
    rangeReached
  );
  const { grade, color: gradeColor } = getFormGrade(formScore);

  // Calculate improvement trend
  const improvementTrend =
    scoreHistory.length >= 2
      ? scoreHistory[scoreHistory.length - 1].score - scoreHistory[scoreHistory.length - 2].score
      : 0;
  const trendLabel =
    improvementTrend > 5 ? '↑ Improving' : improvementTrend < -5 ? '↓ Declining' : '→ Stable';
  const trendColor =
    improvementTrend > 5 ? '#4ade80' : improvementTrend < -5 ? '#ef4444' : '#fbbf24';

  // Calculate average score
  const avgScore =
    scoreHistory.length > 0
      ? Math.round(scoreHistory.reduce((sum, e) => sum + e.score, 0) / scoreHistory.length)
      : null;

  return (
    <section
      className={`curl-instrument curl-instrument--${displayTelemetry.phase}${collapsed && layout !== 'rail' ? ' is-collapsed' : ''}${layout === 'rail' ? ' curl-instrument--rail' : ''}${layout === 'rail' && !tracking ? ' is-stale' : ''}`}
      aria-label="Live curl form instrument"
      role="region"
    >
      <span className="sr-only" aria-live="polite">
        {accessibleStatus}
      </span>
      <div className="curl-instrument__header">
        <div>
          <p className="curl-instrument__eyebrow">{layout === 'rail' ? 'Elbow' : 'Robot demo'}</p>
          <strong>{phaseLabel[displayTelemetry.phase]}</strong>
        </div>
        {layout === 'rail' ? null : (
          <div className="curl-instrument__header-actions">
            <span className="curl-instrument__rep">Match the arm</span>
            <button
              type="button"
              className="curl-instrument__toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-controls="curl-instrument-body"
              aria-label={collapsed ? 'Show form instrument' : 'Hide form instrument'}
            >
              {collapsed ? 'Show' : 'Hide'}
            </button>
          </div>
        )}
      </div>

      {layout !== 'rail' && collapsed && (
        <div className="curl-instrument__collapsed-status" aria-hidden="true">
          <span>
            Angle <strong>{Math.round(angle)}°</strong>
          </span>
          <span>
            Grade <strong style={{ color: gradeColor }}>{grade}</strong>
          </span>
          <span>
            Score <strong>{formScore}/100</strong>
          </span>
        </div>
      )}

      <div id="curl-instrument-body" className="curl-instrument__body-wrap">
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
            <span className="curl-instrument__dial-label curl-instrument__dial-label--top">
              50°
            </span>
            <span className="curl-instrument__dial-label curl-instrument__dial-label--bottom">
              160°
            </span>
          </div>

          <div className="curl-instrument__readings">
            <div className="curl-instrument__reading curl-instrument__reading--primary">
              <span>Elbow angle</span>
              <strong>{Math.round(angle)}°</strong>
              <small>
                target {displayTelemetry.targetMinDeg}–{displayTelemetry.targetMaxDeg}°
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

        {layout === 'rail' ? null : (
          <div
            className="curl-instrument__range"
            aria-label={`Elbow angle ${Math.round(angle)} degrees, target ${displayTelemetry.targetMinDeg} to ${displayTelemetry.targetMaxDeg} degrees`}
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
        )}

        {/* SO-101 Robot Joint Readout */}
        {coachStation.enabled && (
          <div className="curl-instrument__robot">
            <div className="curl-instrument__robot-header">
              <span className="curl-instrument__robot-badge">COACH ARM</span>
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
              {displayTelemetry && robotElbowDeg !== null && (
                <div className="curl-instrument__robot-angle curl-instrument__robot-angle--diff">
                  <span>Delta</span>
                  <strong>
                    {Math.abs(Math.round(displayTelemetry.elbowAngle - robotElbowDeg))}°
                  </strong>
                </div>
              )}
            </div>
            <p className="curl-instrument__robot-tip">
              Match the robot's target angle with your elbow
            </p>
          </div>
        )}

        {/* Live Form Score */}
        <div className="curl-instrument__form-score">
          <div className="curl-instrument__form-score-header">
            <span className="curl-instrument__form-score-label">Form Score</span>
            <span className="curl-instrument__form-score-grade" style={{ color: gradeColor }}>
              {grade}
            </span>
          </div>
          <div className="curl-instrument__form-score-bar">
            <div
              className="curl-instrument__form-score-fill"
              style={{
                width: `${formScore}%`,
                backgroundColor: gradeColor,
              }}
            />
          </div>
          <div className="curl-instrument__form-score-details">
            <span>{formScore}/100</span>
            <span>
              {formScore >= 90
                ? 'Excellent match!'
                : formScore >= 80
                  ? 'Good form'
                  : formScore >= 70
                    ? 'Almost there'
                    : formScore >= 60
                      ? 'Keep adjusting'
                      : 'Match the target angle'}
            </span>
          </div>
        </div>

        {/* Score History */}
        {scoreHistory.length > 0 && (
          <div className="curl-instrument__history">
            <div className="curl-instrument__history-header">
              <span className="curl-instrument__history-label">Score History</span>
              <span className="curl-instrument__history-trend" style={{ color: trendColor }}>
                {trendLabel}
              </span>
            </div>
            <div className="curl-instrument__history-chart">
              {scoreHistory.map((entry) => {
                const height = Math.max(10, (entry.score / 100) * 40);
                const { color } = getFormGrade(entry.score);
                return (
                  <div
                    key={entry.rep}
                    className="curl-instrument__history-bar"
                    style={{
                      height: `${height}px`,
                      backgroundColor: color,
                    }}
                    title={`Rep ${entry.rep}: ${entry.score}/100`}
                  />
                );
              })}
            </div>
            <div className="curl-instrument__history-stats">
              <span>Avg: {avgScore !== null ? `${avgScore}/100` : '—'}</span>
              <span>Best: {Math.max(...scoreHistory.map((e) => e.score))}/100</span>
              <span>Reps: {scoreHistory.length}</span>
            </div>
          </div>
        )}

        {/* Coach Comparison — meaningful only after the first measured rep, so
          it's staged in via progressive disclosure instead of crowding the
          pre-rep surface. */}
        {layout !== 'rail' && repCount > 0 && (
          <div className="curl-instrument__coach-compare">
            <div className="curl-instrument__coach-compare-header">
              <span className="curl-instrument__coach-compare-label">Coach Feedback</span>
              <span className="curl-instrument__coach-compare-personality">
                {COACH_PERSONALITIES[currentPersonality].emoji}{' '}
                {COACH_PERSONALITIES[currentPersonality].name}
              </span>
            </div>
            <p className="curl-instrument__coach-compare-feedback">
              {getPersonalityFeedback(currentPersonality, 'form_feedback', formScore)}
            </p>

            {/* Compact Coach Switcher — the description travels with the
                name: a persona is a tempo choice, and the picker says so. */}
            <div className="curl-instrument__coach-switcher">
              {(Object.keys(COACH_PERSONALITIES) as CoachPersonality[]).map((personality) => {
                const coach = COACH_PERSONALITIES[personality];
                const selected = currentPersonality === personality;
                return (
                  <button
                    key={personality}
                    type="button"
                    className={`curl-instrument__coach-switcher-btn${selected ? ' is-selected' : ''}`}
                    onClick={() => setPersonality(personality)}
                    aria-label={`Switch to ${coach.name} coach — ${coach.description}`}
                    aria-pressed={selected}
                    title={coach.description}
                  >
                    <span>{coach.emoji}</span>
                    <span>{coach.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="curl-instrument__coach-compare-feedback">
              {COACH_PERSONALITIES[currentPersonality].description}
            </p>

            <div className="curl-instrument__coach-compare-others">
              {(Object.keys(COACH_PERSONALITIES) as CoachPersonality[])
                .filter((p) => p !== currentPersonality)
                .map((personality) => (
                  <div key={personality} className="curl-instrument__coach-compare-other">
                    <span>{COACH_PERSONALITIES[personality].emoji}</span>
                    <span className="curl-instrument__coach-compare-other-feedback">
                      {getPersonalityFeedback(personality, 'form_feedback', formScore)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Reps and Form Status */}
        {layout !== 'rail' && repCount > 0 && (
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
      </div>
    </section>
  );
}

export default CurlFormInstrument;
