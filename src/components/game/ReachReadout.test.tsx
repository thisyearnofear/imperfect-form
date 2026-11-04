import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameHUD } from './GameHUD';
import { ReachCueLine } from './ReachCueLine';
import { qualityGates, reachExpectationLine, reachRaisePeaks } from '@/lib/reachReading';
import { OVERHEAD_REACH_PROTOCOL } from '@/types/movementAssessment';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { SessionSummary } from '@/services/sessionLogger';

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * DOM-verification for the reach read's reliability surfaces: the live
 * elevation gauge beside the pips and the one-line explainer. Rendered to
 * static markup — the session hooks are provider-free.
 */
describe('ReachElevGauge (GameHUD, reach reading)', () => {
  it('shows the live elevation next to a marker at the 135° rep line', () => {
    const markup = renderToStaticMarkup(
      <GameHUD
        mode="reach"
        timeLeft={120}
        repCount={0}
        formatTime={fmt}
        readingTargetReps={5}
        reachElevationDeg={120}
      />
    );
    expect(markup).toContain('hud-elev');
    expect(markup).toContain('elev ~120°');
    expect(markup).toContain('role="meter"');
    expect(markup).toContain('aria-valuenow="120"');
    // The rep-line tick sits at 135/180 = 75% of the track.
    expect(markup).toContain('hud-elev__line');
    expect(markup).toContain('bottom:75%');
    expect(markup).toContain('135° line');
  });

  it('stays mounted with an honest empty read when the arm is out of frame', () => {
    const markup = renderToStaticMarkup(
      <GameHUD
        mode="reach"
        timeLeft={120}
        repCount={0}
        formatTime={fmt}
        readingTargetReps={5}
        reachElevationDeg={null}
      />
    );
    expect(markup).toContain('hud-elev');
    expect(markup).toContain('elev —');
    expect(markup).toContain('aria-valuetext="arm not in frame"');
  });

  it('does not render for non-reach modes or non-reading sessions', () => {
    const curls = renderToStaticMarkup(
      <GameHUD mode="curls" timeLeft={120} repCount={0} formatTime={fmt} readingTargetReps={5} />
    );
    expect(curls).not.toContain('hud-elev');

    const openSet = renderToStaticMarkup(
      <GameHUD mode="reach" timeLeft={120} repCount={0} formatTime={fmt} />
    );
    expect(openSet).not.toContain('hud-elev');
  });

  it('renders on the mobile pill branch too', () => {
    const markup = renderToStaticMarkup(
      <GameHUD
        mode="reach"
        timeLeft={120}
        repCount={0}
        formatTime={fmt}
        isMobile
        readingTargetReps={5}
        reachElevationDeg={88}
      />
    );
    expect(markup).toContain('hud-elev');
    expect(markup).toContain('elev ~88°');
  });
});

describe('ReachCueLine', () => {
  it('renders the cue text inside the quiet readiness pill', () => {
    const markup = renderToStaticMarkup(
      <ReachCueLine text="Close — a little higher for the line." />
    );
    expect(markup).toContain('data-reach-cue');
    expect(markup).toContain('Close — a little higher for the line.');
    expect(markup).toContain('readiness-hint');
    expect(markup).toContain('role="status"');
  });

  it('renders nothing when there is no cue', () => {
    expect(renderToStaticMarkup(<ReachCueLine text={null} />)).toBe('');
  });
});

/** A 5fps trace of `elevDegs` frame elevations (depth = elevation / 160). */
function traceOf(elevDegs: number[]): SessionSummary {
  return {
    startTime: 0,
    endTime: elevDegs.length * 200,
    duration: elevDegs.length * 0.2,
    mode: 'reach',
    repCount: 5,
    avgDepth: 0.5,
    maxTrunkLean: 0,
    maxKneeValgus: 0,
    warningCount: 0,
    anomalies: [],
    trace: elevDegs.map((deg, i) => ({
      timestamp: i * 200,
      metrics: {
        trunkLean: 0,
        kneeValgus: 0,
        ankleFlexion: 0,
        depth: deg / 160,
        symmetry: 1,
        isStable: true,
        warnings: [],
      },
      keypoints: [],
    })),
  };
}

describe('reachRaisePeaks', () => {
  it('finds one peak per excursion above the lowered line, marked vs 135°', () => {
    const summary = traceOf([
      // raise 1 — crosses the line
      0, 60, 120, 145, 130, 40,
      // raise 2 — near-miss, never crosses
      70, 110, 120, 60, 20,
      // raise 3 — still up at trace end
      90, 150,
    ]);
    const peaks = reachRaisePeaks(summary);
    expect(peaks.map((p) => p.elevationDeg)).toEqual([145, 120, 150]);
    expect(peaks.map((p) => p.metLine)).toEqual([true, false, true]);
    expect(peaks.map((p) => p.index)).toEqual([1, 2, 3]);
  });

  it('returns nothing without a trace', () => {
    expect(reachRaisePeaks(null)).toEqual([]);
  });
});

describe('reachExpectationLine', () => {
  it('states the 135° target before the first rep', () => {
    expect(reachExpectationLine({ repCount: 0, countedReps: 0, elevationDeg: null })).toBe(
      'The line is 135° — raise to your comfortable max, your own pace.'
    );
  });

  it('says what a complete rep needs between counted reps, arm back down', () => {
    expect(reachExpectationLine({ repCount: 3, countedReps: 2, elevationDeg: 20 })).toBe(
      'Reach the line, come back down — that’s one.'
    );
  });

  it('stays quiet mid-rep, before a counted rep, and when no arm is read', () => {
    expect(reachExpectationLine({ repCount: 3, countedReps: 2, elevationDeg: 90 })).toBeNull();
    expect(reachExpectationLine({ repCount: 1, countedReps: 0, elevationDeg: 20 })).toBeNull();
    expect(reachExpectationLine({ repCount: 3, countedReps: 2, elevationDeg: null })).toBeNull();
  });
});

describe('qualityGates', () => {
  const base: MovementAssessment = {
    version: '1.0',
    protocolId: 'reach-baseline',
    protocolVersion: '1.0',
    mode: 'reach',
    capturedAt: 0,
    status: 'valid',
    confidence: 0.8,
    quality: {
      poseConfidence: 0.7,
      observedFrameRatio: 0.8,
      bilateralFrameRatio: 0.9,
      stableFrameRatio: 0.6,
      traceFrames: 20,
      repCount: 5,
    },
    measurements: { range: 0.6, control: 0.7, symmetry: 0.9, traceStability: 0.8 },
  };

  it('compares the record against the protocol’s own minimums', () => {
    const gates = qualityGates(base, OVERHEAD_REACH_PROTOCOL);
    expect(gates.map((g) => g.label)).toEqual([
      'Reps',
      'Frames',
      'Confidence',
      'Observed',
      'Both arms',
      'Stable',
    ]);
    expect(gates.every((g) => g.pass)).toBe(true);
  });

  it('marks the gate that failed — the honest reason a read went inconclusive', () => {
    const short: MovementAssessment = {
      ...base,
      status: 'inconclusive',
      quality: { ...base.quality, bilateralFrameRatio: 0.2, repCount: 3 },
    };
    const gates = qualityGates(short, OVERHEAD_REACH_PROTOCOL);
    const byLabel = Object.fromEntries(gates.map((g) => [g.label, g.pass]));
    expect(byLabel['Reps']).toBe(false);
    expect(byLabel['Both arms']).toBe(false);
    expect(byLabel['Frames']).toBe(true);
  });
});
