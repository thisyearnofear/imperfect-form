import { describe, expect, it } from 'vitest';
import {
  WEEK_PAIRING,
  feelWindowDelta,
  weekPairing,
  weeklyPairingFor,
} from '@/lib/movementCompare';
import { isFeelEntry, type NiggleEntry } from '@/lib/niggleEntries';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 0, 20, 12);

function assessment(range: number, capturedAt: number): MovementAssessment {
  return {
    version: '1.0',
    protocolId: 'reach-baseline',
    protocolVersion: '1.0',
    mode: 'reach',
    capturedAt,
    status: 'valid',
    confidence: 0.8,
    quality: {
      poseConfidence: 0.8,
      observedFrameRatio: 0.9,
      bilateralFrameRatio: 0.8,
      stableFrameRatio: 0.7,
      traceFrames: 120,
      repCount: 5,
    },
    measurements: { range, control: 0.75, symmetry: 0.85, traceStability: 0.7 },
  };
}

function feel(daysAgo: number, severity: number, joint: NiggleEntry['joint'] = 'neck-shoulders') {
  return { joint, severity, timestamp: NOW - daysAgo * DAY };
}

describe('isFeelEntry', () => {
  it('counts 1–5 severity entries and ignores note-only logbook lines', () => {
    expect(isFeelEntry({ joint: 'knee', severity: 3, timestamp: NOW })).toBe(true);
    expect(isFeelEntry({ joint: 'knee', note: 'Stopped a reading for pain', timestamp: NOW })).toBe(
      false
    );
    expect(isFeelEntry({ joint: 'knee', severity: 9, timestamp: NOW })).toBe(false);
  });
});

describe('feelWindowDelta', () => {
  it('averages the recent window against everything before it', () => {
    const entries = [feel(12, 4), feel(2, 2), feel(1, 3)];
    const delta = feelWindowDelta(entries, NOW);
    expect(delta).not.toBeNull();
    expect(delta!.recentAvg).toBeCloseTo(2.5);
    expect(delta!.priorAvg).toBeCloseTo(4);
    expect(delta!.delta).toBeCloseTo(-1.5);
  });

  it('returns null with fewer than two recent check-ins or no prior baseline', () => {
    expect(feelWindowDelta([feel(2, 3), feel(12, 4)], NOW)).toBeNull();
    expect(feelWindowDelta([feel(2, 3), feel(1, 4)], NOW)).toBeNull();
    expect(feelWindowDelta([], NOW)).toBeNull();
  });

  it('filters to the joint the reading serves when asked', () => {
    const entries = [feel(12, 5, 'knee'), feel(12, 4), feel(2, 2), feel(1, 2)];
    const delta = feelWindowDelta(entries, NOW, 10, 'neck-shoulders');
    expect(delta!.priorAvg).toBeCloseTo(4);
    expect(feelWindowDelta(entries, NOW, 10, 'back')).toBeNull();
  });
});

describe('weekPairing — the three honest states', () => {
  const previous = assessment(0.5, NOW - 8 * DAY);
  const improved = assessment(0.65, NOW); // range +0.15
  const flat = assessment(0.51, NOW); // within epsilon
  const worsened = assessment(0.4, NOW); // range −0.10

  it('(a) numbers improved and feels agree → felt-it-too', () => {
    const entries = [feel(12, 4), feel(11, 4), feel(2, 2), feel(1, 3)];
    const pairing = weekPairing(previous, improved, entries, { now: NOW });
    expect(pairing?.state).toBe('felt-it-too');
    expect(pairing?.headline).toBe('you felt it too — the numbers agree');
  });

  it('(b) numbers moved and feels held flat → meter-first', () => {
    const entries = [feel(12, 3), feel(11, 3), feel(2, 3), feel(1, 3)];
    expect(weekPairing(previous, improved, entries, { now: NOW })?.state).toBe('meter-first');
    // The meter can also catch a slide before the body reports it.
    expect(weekPairing(previous, worsened, entries, { now: NOW })?.state).toBe('meter-first');
    expect(weekPairing(previous, worsened, entries, { now: NOW })?.headline).toBe(
      'the meter moved first — feeling often lags'
    );
  });

  it('(c) feels worse outranks the numbers → still-hurts', () => {
    const entries = [feel(12, 2), feel(11, 3), feel(2, 5), feel(1, 4)];
    // Even with improved numbers, the professional door is the line.
    const pairing = weekPairing(previous, improved, entries, { now: NOW });
    expect(pairing?.state).toBe('still-hurts');
    expect(pairing?.headline).toBe('if it keeps hurting, worth seeing a professional');
    expect(weekPairing(previous, worsened, entries, { now: NOW })?.state).toBe('still-hurts');
  });

  it('renders no fourth state — disagreement or thin stories stay quiet', () => {
    const feelsBetter = [feel(12, 4), feel(11, 4), feel(2, 2), feel(1, 2)];
    // Numbers flat + feels better: a nice week, not a pairing.
    expect(weekPairing(previous, flat, feelsBetter, { now: NOW })).toBeNull();
    // Numbers down + feels better: the two halves disagree — nothing honest to say.
    expect(weekPairing(previous, worsened, feelsBetter, { now: NOW })).toBeNull();
    // Both flat.
    const allFlat = [feel(12, 3), feel(11, 3), feel(2, 3), feel(1, 3)];
    expect(weekPairing(previous, flat, allFlat, { now: NOW })).toBeNull();
  });

  it('respects the epsilons — small moves are noise, not a story', () => {
    const entries = [feel(12, 4), feel(11, 4), feel(2, 2), feel(1, 2)];
    // rangeDelta inside ±3pp → not "moved".
    expect(
      weekPairing(previous, assessment(0.5 + WEEK_PAIRING.movementEpsilon - 0.001, NOW), entries, {
        now: NOW,
      })
    ).toBeNull();
    // feelDelta inside ±0.5 with a real range move → the flat-feel branch.
    const nearlyFlat = [feel(12, 3), feel(11, 3), feel(2, 3), feel(1, 3.4)];
    expect(weekPairing(previous, improved, nearlyFlat, { now: NOW })?.state).toBe('meter-first');
  });

  it('requires a comparable pair and a thick-enough feel log', () => {
    const entries = [feel(12, 4), feel(11, 4), feel(2, 2), feel(1, 3)];
    const differentProtocol = { ...previous, protocolId: 'curls-baseline' };
    expect(weekPairing(differentProtocol, improved, entries, { now: NOW })).toBeNull();
    expect(weekPairing(previous, improved, [feel(2, 2)], { now: NOW })).toBeNull();
    expect(weekPairing(previous, improved, [feel(2, 2), feel(1, 3)], { now: NOW })).toBeNull();
  });
});

describe('weeklyPairingFor — the recap gate', () => {
  const current = assessment(0.65, NOW);
  const priorRecord: StoredMovementAssessment = {
    id: 'r1',
    userId: 'guest',
    sourceSessionId: 's1',
    savedAt: NOW - 8 * DAY,
    assessment: assessment(0.5, NOW - 8 * DAY),
  };
  const entries = [feel(12, 4), feel(11, 4), feel(2, 2), feel(1, 3)];

  it('pairs when a valid read meets an earlier valid read and a real feel log', () => {
    const pairing = weeklyPairingFor({
      current,
      stored: [priorRecord],
      entries,
      joint: 'neck-shoulders',
      now: NOW,
    });
    expect(pairing?.state).toBe('felt-it-too');
  });

  it('stays quiet on an inconclusive read, no prior valid, or the same read twice', () => {
    const inconclusive = { ...current, status: 'inconclusive' as const, measurements: null };
    expect(
      weeklyPairingFor({ current: inconclusive, stored: [priorRecord], entries, now: NOW })
    ).toBeNull();
    expect(weeklyPairingFor({ current, stored: [], entries, now: NOW })).toBeNull();
    // The current read already persisted excludes itself from "previous".
    const selfRecord: StoredMovementAssessment = {
      ...priorRecord,
      id: 'r2',
      assessment: current,
    };
    expect(weeklyPairingFor({ current, stored: [selfRecord], entries, now: NOW })).toBeNull();
  });

  it('compares against the latest earlier valid read, not inconclusives', () => {
    const newerInconclusive: StoredMovementAssessment = {
      ...priorRecord,
      id: 'r3',
      assessment: { ...current, status: 'inconclusive', measurements: null, capturedAt: NOW - DAY },
    };
    const pairing = weeklyPairingFor({
      current,
      stored: [priorRecord, newerInconclusive],
      entries,
      joint: 'neck-shoulders',
      now: NOW,
    });
    expect(pairing?.rangeDelta).toBeCloseTo(0.15);
  });
});
