'use client';

import React from 'react';
import { SessionRecap } from '@/components/game/SessionRecap';
import ReadingDetail from '@/components/game/ReadingDetail';
import { GameHUD } from '@/components/game/GameHUD';
import { ReachCueLine } from '@/components/game/ReachCueLine';
import { reachExpectationLine } from '@/lib/reachReading';
import { OVERHEAD_REACH_PROTOCOL } from '@/types/movementAssessment';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { SessionSummary } from '@/services/sessionLogger';

/**
 * Dev-only fixture surface for the reach-reading UX pass: the compressed
 * staged recap, the populated detail accordion, and the session HUD's
 * pre-first-rep expectation line — all on real components, no camera.
 */

// A 5fps trace with six excursions: the free warm-up raise plus five counted
// raises, one of them a near-miss under the 135° line.
const ELEVATIONS = [
  0,
  40,
  90,
  148,
  120,
  30, // warm-up — counted by the eye, not the meter
  0,
  60,
  120,
  142,
  60,
  20,
  0,
  80,
  138,
  60,
  10,
  0,
  70,
  118,
  122,
  40,
  10, // raise 3 — near-miss
  0,
  90,
  144,
  70,
  20,
  0,
  80,
  140,
  60,
  10,
];
const summary: SessionSummary = {
  startTime: Date.now() - 30_000,
  endTime: Date.now(),
  duration: 30,
  mode: 'reach',
  repCount: 5,
  avgDepth: 0.62,
  maxTrunkLean: 24,
  maxKneeValgus: 0,
  warningCount: 1,
  anomalies: [
    {
      timestamp: 12_000,
      metrics: {
        trunkLean: 34,
        kneeValgus: 0,
        ankleFlexion: 0,
        depth: 0.8,
        symmetry: 0.9,
        isStable: true,
        warnings: ['TRUNK SWAY'],
      },
      keypoints: [],
    },
  ],
  trace: ELEVATIONS.map((deg, i) => ({
    timestamp: i * 200,
    metrics: {
      trunkLean: i === 30 ? 24 : 8,
      kneeValgus: 0,
      ankleFlexion: 0,
      depth: deg / 160,
      symmetry: 0.86,
      isStable: true,
      warnings: i === 30 ? ['TRUNK SWAY'] : [],
    },
    keypoints: [],
  })),
};

const assessment: MovementAssessment = {
  version: '1.0',
  protocolId: 'reach-baseline',
  protocolVersion: '1.0',
  mode: 'reach',
  capturedAt: Date.now(),
  status: 'valid',
  confidence: 0.78,
  quality: {
    poseConfidence: 0.74,
    observedFrameRatio: 0.88,
    bilateralFrameRatio: 0.82,
    stableFrameRatio: 0.71,
    traceFrames: 120,
    repCount: 5,
  },
  measurements: { range: 0.62, control: 0.78, symmetry: 0.86, traceStability: 0.74 },
};

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function DebugRecapPage() {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '12px' }}>
      <h2 style={{ color: '#83e8d5', fontSize: 11, letterSpacing: '0.1em' }}>
        STAGED RECAP — compressed (scroll)
      </h2>
      <SessionRecap
        mode="reach"
        reps={5}
        summary={summary}
        movementAssessment={assessment}
        workouts={[]}
      />

      <h2 style={{ color: '#83e8d5', fontSize: 11, letterSpacing: '0.1em', marginTop: 32 }}>
        ADVANCED ANALYSIS — populated accordion
      </h2>
      <details className="recap-details" open>
        <summary>Advanced analysis</summary>
        <ReadingDetail
          assessment={assessment}
          protocol={OVERHEAD_REACH_PROTOCOL}
          summary={summary}
        />
      </details>

      <h2 style={{ color: '#83e8d5', fontSize: 11, letterSpacing: '0.1em', marginTop: 32 }}>
        SESSION HUD — pre-first-rep expectation line
      </h2>
      <div
        className="session-camera-stage"
        style={{ position: 'relative', height: 420, background: '#04100f', borderRadius: 8 }}
      >
        <GameHUD
          mode="reach"
          timeLeft={120}
          repCount={0}
          formatTime={fmt}
          readingTargetReps={5}
          reachElevationDeg={null}
        />
        <ReachCueLine
          text={reachExpectationLine({ repCount: 0, countedReps: 0, elevationDeg: null })}
          elevated
        />
      </div>
    </div>
  );
}
