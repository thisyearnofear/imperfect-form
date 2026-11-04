import { describe, expect, it } from 'vitest';
import { buildHandoffSummary, HANDOFF_WINDOW } from '@/lib/handoffSummary';
import { EASE_ROUTINE_NOTE, type NiggleEntry } from '@/lib/niggleEntries';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';

const DAY = 86_400_000;
// Local-time construction so formatDay's weekday/month names are stable.
const NOW = new Date(2026, 0, 20, 12).getTime(); // Tue 20 Jan 2026

let seq = 0;
function record(assessment: MovementAssessment): StoredMovementAssessment {
  seq += 1;
  return {
    id: `a-${seq}`,
    userId: 'guest',
    sourceSessionId: `s-${seq}`,
    savedAt: assessment.capturedAt,
    assessment,
  };
}

function validRead(
  capturedAt: number,
  range: number,
  control = 0.7,
  symmetry: number | null = 0.8
) {
  return record({
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
    measurements: { range, control, symmetry, traceStability: 0.7 },
  });
}

function inconclusiveRead(capturedAt: number) {
  return record({
    version: '1.0',
    protocolId: 'reach-baseline',
    protocolVersion: '1.0',
    mode: 'reach',
    capturedAt,
    status: 'inconclusive',
    confidence: 0.3,
    quality: {
      poseConfidence: 0.3,
      observedFrameRatio: 0.2,
      bilateralFrameRatio: 0.1,
      stableFrameRatio: 0.1,
      traceFrames: 8,
      repCount: 5,
    },
    measurements: null,
    inconclusiveReason: 'low_visibility',
  });
}

function feel(daysAgo: number, severity: number, note?: string): NiggleEntry {
  return {
    joint: 'neck-shoulders',
    severity,
    note,
    timestamp: NOW - daysAgo * DAY,
  };
}

describe('buildHandoffSummary — the week, for a professional', () => {
  it('names the niggle, the reads, the feel log and what the meter is', () => {
    const text = buildHandoffSummary({
      niggle: { joint: 'My neck & shoulders', context: 'Tension after desk work' },
      stored: [validRead(NOW - 7 * DAY, 0.5), validRead(NOW, 0.62)],
      entries: [feel(6, 3), feel(1, 4), feel(1, 2, EASE_ROUTINE_NOTE)],
      now: NOW,
    });

    expect(text).toContain('A niggle log — from Niggleometer, for a professional to read');
    expect(text).toContain('The niggle — my neck & shoulders · tension after desk work');
    // Tue 13 Jan → Tue 20 Jan: range 50% → 62%, control 70% flat, balance 80%.
    expect(text).toContain('Tue 13 Jan · overhead reach — a clean read — range 50%');
    expect(text).toContain(
      'Tue 20 Jan · overhead reach — a clean read — range 62% · control 70% · balance 80%'
    );
    expect(text).toContain('vs the read before — range +12% · control 0% · balance 0%');
    expect(text).toContain('Wed 14 Jan — 3/5');
    expect(text).toContain('Mon 19 Jan — 4/5');
    expect(text).toContain('The ease work — 1 gentle routine done');
    expect(text).toContain('not a clinical test');
    expect(text).toContain('not a diagnosis');
  });

  it('marks inconclusive reads honestly — never as failure or missing data', () => {
    const text = buildHandoffSummary({
      stored: [validRead(NOW - 7 * DAY, 0.5), inconclusiveRead(NOW)],
      entries: [],
      now: NOW,
    });
    expect(text).toContain(
      'Tue 20 Jan · overhead reach — inconclusive — the meter could not get a clean read'
    );
    expect(text).not.toContain('error');
  });

  it('anchors deltas to the previous valid read on the same protocol only', () => {
    // An inconclusive read between the two valids must not break the chain;
    // a curls read is a different protocol and never anchors a reach delta.
    const curls = record({
      ...validRead(NOW - 3 * DAY, 0.9).assessment,
      protocolId: 'curls-baseline',
      mode: 'curls',
    });
    const text = buildHandoffSummary({
      stored: [
        validRead(NOW - 14 * DAY, 0.5),
        inconclusiveRead(NOW - 10 * DAY),
        curls,
        validRead(NOW, 0.55),
      ],
      entries: [],
      now: NOW,
    });
    expect(text).toContain('vs the read before — range +5% · control 0% · balance 0%');
    expect(text).toContain('curl');
    // The curls read is first-in-window for its protocol → no delta line of its own.
    expect(text.match(/vs the read before/g)).toHaveLength(1);
  });

  it('reads without a prior valid read carry no delta claim', () => {
    const text = buildHandoffSummary({
      stored: [validRead(NOW, 0.5)],
      entries: [],
      now: NOW,
    });
    expect(text).not.toContain('vs the read before');
  });

  it('drops balance when the read never measured symmetry', () => {
    const text = buildHandoffSummary({
      stored: [validRead(NOW - 7 * DAY, 0.5, 0.7, null), validRead(NOW, 0.6, 0.75, null)],
      entries: [],
      now: NOW,
    });
    expect(text).toContain('range 60% · control 75%');
    expect(text).not.toContain('balance');
    expect(text).toContain('vs the read before — range +10% · control +5%');
  });

  it('keeps thin weeks honest — no invented reads, no invented feels', () => {
    const text = buildHandoffSummary({ stored: [], entries: [], now: NOW });
    expect(text).toContain('The niggle — no joint named');
    expect(text).toContain('no reads yet — the first read starts the history');
    expect(text).toContain('no check-ins logged this week');
    expect(text).not.toContain('The ease work');
  });

  it('windows the data — old reads and old feels stay out of the week', () => {
    const oldRead = validRead(NOW - (HANDOFF_WINDOW.readsDays + 5) * DAY, 0.9);
    const text = buildHandoffSummary({
      stored: [oldRead, validRead(NOW, 0.5)],
      entries: [feel(HANDOFF_WINDOW.feelsDays + 3, 5), feel(2, 2)],
      now: NOW,
    });
    expect(text).not.toContain('90%');
    expect(text).not.toContain('5/5');
    expect(text).toContain('2/5');
    // The current read's delta still anchors to the older valid read —
    // the anchor searches full history even when it prints out of window.
    expect(text).toContain('vs the read before — range -40%');
  });

  it('counts ease routines by their logbook trace only, inside the window', () => {
    const text = buildHandoffSummary({
      stored: [],
      entries: [
        feel(3, 2, EASE_ROUTINE_NOTE),
        feel(2, 3, 'How it felt today'),
        feel(HANDOFF_WINDOW.feelsDays + 4, 2, EASE_ROUTINE_NOTE),
      ],
      now: NOW,
    });
    expect(text).toContain('The ease work — 1 gentle routine done');
  });
});
