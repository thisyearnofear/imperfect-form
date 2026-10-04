import { describe, expect, it } from 'vitest';
import { buildVerdict, formatGates, gateFail, gateNoData, gatePass } from '@/lib/gates';
import {
  evaluateFormGates,
  FORM_CHECK_CONFIDENCE,
  FORM_CHECK_THRESHOLDS,
} from '@/lib/coachingEngine';
import type { BiomechanicalState } from '@/types/mediapipe';

describe('gate verdict', () => {
  it('passes only when every gate passes', () => {
    const gates = [gatePass('a', 'A', 1, '1'), gatePass('b', 'B', 2, '2')];
    const verdict = buildVerdict(gates);
    expect(verdict.passed).toBe(true);
    expect(verdict.status).toBe('passes');
    expect(verdict.firstFailure).toBeNull();
    expect(verdict.gates).toBe(gates);
  });

  it('fails on the first failing gate and reports only that one', () => {
    const gates = [
      gateFail('depth', 'range of motion', 0.1, '0.3-0.9', 'Too shallow.'),
      gateFail('symmetry', 'balance', 0.4, '>= 0.7', 'Uneven.'),
    ];
    const verdict = buildVerdict(gates);
    expect(verdict.status).toBe('reviewable');
    expect(verdict.passed).toBe(false);
    expect(verdict.firstFailure?.id).toBe('depth');
  });

  it('treats an unevaluable gate as insufficient data, never as a pass', () => {
    const verdict = buildVerdict([
      gatePass('a', 'A', 1, '1'),
      gateNoData('b', 'B', '>= 2', 'Nothing to compare against.'),
    ]);
    expect(verdict.status).toBe('insufficient-data');
    expect(verdict.passed).toBe(false);
    expect(verdict.firstFailure?.id).toBe('b');
  });

  it('reports the first real failure as the reason even when a later gate has no data', () => {
    const verdict = buildVerdict([
      gateFail('a', 'A', 0, '1', 'failed'),
      gateNoData('b', 'B', '1', 'missing'),
    ]);
    // The reason shown is the earliest problem, but the verdict still refuses
    // to claim anything while a gate is unevaluated.
    expect(verdict.firstFailure?.id).toBe('a');
    expect(verdict.status).toBe('insufficient-data');
  });

  it('reports gateFail with a null value as no-data rather than a failure', () => {
    expect(gateFail('a', 'A', null, '1', 'why').passed).toBe('no-data');
  });

  it('treats an empty gate list as passing', () => {
    expect(buildVerdict([]).status).toBe('passes');
  });
});

describe('gate formatting', () => {
  it('renders a row per gate and appends the single reason', () => {
    const text = formatGates([
      gatePass('depth', 'range of motion', 0.75, '0.3-0.9'),
      gateFail('symmetry', 'balance', 0.4, '>= 0.7', 'Balance weight evenly.'),
    ]);
    expect(text).toContain('| depth | range of motion | PASS | 0.75 | 0.3-0.9 |');
    expect(text).toContain('| symmetry | balance | FAIL | 0.4 | >= 0.7 |');
    expect(text).toContain('Balance weight evenly.');
  });

  it('renders an empty table for no gates', () => {
    expect(formatGates([])).toBe('');
  });
});

function metrics(overrides: Partial<BiomechanicalState> = {}): BiomechanicalState {
  return {
    trunkLean: 0,
    kneeValgus: 0,
    ankleFlexion: 80,
    depth: 0.75,
    symmetry: 1,
    isStable: true,
    warnings: [],
    ...overrides,
  };
}

describe('form gates', () => {
  it('passes a clean rep', () => {
    const verdict = evaluateFormGates(metrics(), 'pushups');
    expect(verdict.status).toBe('passes');
    expect(verdict.gates.every((gate) => gate.passed === 'pass')).toBe(true);
  });

  it('reports the first failing check as the reason', () => {
    const verdict = evaluateFormGates(metrics({ depth: 0.1, symmetry: 0.2 }), 'squats');
    expect(verdict.status).toBe('reviewable');
    expect(verdict.firstFailure?.id).toBe('depth');
    expect(verdict.gates.find((gate) => gate.id === 'symmetry')?.passed).toBe('fail');
  });

  it('reports a passing gate with the measured value, not a zero placeholder', () => {
    const gates = evaluateFormGates(metrics({ depth: 0.75 }), 'pushups').gates;
    expect(gates.find((gate) => gate.id === 'depth')?.value).toBe(0.75);
  });

  it('omits checks the mode cannot answer, so a clean rep still passes', () => {
    // Depth is not graded for curls.
    const curlGates = evaluateFormGates(metrics(), 'curls').gates;
    expect(curlGates.map((gate) => gate.id)).not.toContain('depth');
    expect(evaluateFormGates(metrics(), 'curls').status).toBe('passes');

    // Ankle mobility is squats-only; squats do grade depth.
    const squatGates = evaluateFormGates(metrics(), 'squats').gates;
    expect(squatGates.map((gate) => gate.id)).toContain('ankle_flexion');
    expect(squatGates.map((gate) => gate.id)).toContain('depth');

    // Ankle mobility is absent everywhere else.
    expect(evaluateFormGates(metrics(), 'pushups').gates.map((gate) => gate.id)).not.toContain(
      'ankle_flexion'
    );
  });

  it('treats info-level feedback as a pass, not a failure', () => {
    const verdict = evaluateFormGates(metrics({ depth: 0.95 }), 'pullups');
    expect(verdict.status).toBe('passes');
    expect(verdict.gates.find((gate) => gate.id === 'depth')?.value).toBe(0.95);
  });

  it('fails on an unstable rep', () => {
    const verdict = evaluateFormGates(metrics({ isStable: false }), 'pushups');
    expect(verdict.firstFailure?.id).toBe('stability');
  });

  it('uses the squat lean limit for squats and the default elsewhere', () => {
    const squat = evaluateFormGates(metrics({ trunkLean: 20 }), 'squats');
    expect(squat.status).toBe('passes');

    const pushup = evaluateFormGates(metrics({ trunkLean: 20 }), 'pushups');
    expect(pushup.status).toBe('reviewable');
    expect(pushup.firstFailure?.limit).toContain(String(FORM_CHECK_THRESHOLDS.trunkLean.warning));
  });
});

describe('threshold table', () => {
  it('records the limits the docs and tests both restate', () => {
    expect(FORM_CHECK_THRESHOLDS).toEqual({
      depth: { critical: 0.3, warning: 0.6, target: 0.85, good: 0.9 },
      trunkLean: { warning: 15, squatsWarning: 30, critical: 45 },
      kneeValgus: { warning: 30, critical: 50, target: 20 },
      ankleFlexion: { info: 60, target: 80 },
      symmetry: { warning: 0.7, target: 0.9 },
    });
  });

  it('keeps severities ordered so critical is always stricter than warning', () => {
    const T = FORM_CHECK_THRESHOLDS;
    expect(T.depth.critical).toBeLessThan(T.depth.warning);
    expect(T.depth.warning).toBeLessThan(T.depth.target);
    expect(T.kneeValgus.warning).toBeLessThan(T.kneeValgus.critical);
    expect(T.trunkLean.warning).toBeLessThan(T.trunkLean.squatsWarning);
    expect(T.trunkLean.squatsWarning).toBeLessThan(T.trunkLean.critical);
  });

  it('keeps every confidence within 0-1', () => {
    for (const [name, value] of Object.entries(FORM_CHECK_CONFIDENCE)) {
      expect(value, name).toBeGreaterThan(0);
      expect(value, name).toBeLessThanOrEqual(1);
    }
  });
});
