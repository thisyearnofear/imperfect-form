import { describe, expect, it } from 'vitest';
import { analyzeForm, convertToLegacyFormat } from '@/lib/coachingEngine';
import type { CoachingAnalysis } from '@/lib/coachingEngine';
import type { ExerciseMode } from '@/utils/biomechanics';
import type { BiomechanicalState } from '@/types/mediapipe';

/**
 * Characterization tests for the coaching engine.
 *
 * These lock the current threshold/severity/confidence table so the gate
 * refactor can be proven behavior-preserving. Every literal asserted here is a
 * number that also appears in FORM_CHECK_THRESHOLDS / FORM_CHECK_CONFIDENCE
 * after the refactor, and in docs/COACH_GATES.md.
 */

/** All-ideal metrics: nothing should fire. */
function ideal(overrides: Partial<BiomechanicalState> = {}): BiomechanicalState {
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

const ALL_MODES: ExerciseMode[] = ['pushups', 'squats', 'pullups', 'jumps', 'curls'];

function issueTypes(analysis: CoachingAnalysis): string[] {
  return analysis.issues.map((issue) => issue.type);
}

describe('coaching engine — stability', () => {
  it('reports a critical stability issue when the rep is not stable', () => {
    const analysis = analyzeForm(ideal({ isStable: false }), 'pushups');
    expect(analysis.issues).toEqual([
      {
        type: 'stability',
        severity: 'critical',
        current: 0,
        target: 1,
        cue: 'Stabilize your form!',
        priority: 1,
        confidence: 0.95,
      },
    ]);
  });

  it('is the highest priority issue regardless of mode', () => {
    for (const mode of ALL_MODES) {
      const analysis = analyzeForm(
        ideal({ isStable: false, depth: 0.1, symmetry: 0.2, kneeValgus: 80, trunkLean: 90 }),
        mode
      );
      expect(analysis.primaryIssue?.type).toBe('stability');
      expect(analysis.primaryIssue?.priority).toBe(1);
    }
  });
});

describe('coaching engine — depth', () => {
  it('is skipped entirely for curls', () => {
    for (const depth of [0, 0.2, 0.5, 0.95]) {
      expect(issueTypes(analyzeForm(ideal({ depth }), 'curls'))).not.toContain('depth');
    }
  });

  it('is critical below 0.3 and speaks squat-specific copy', () => {
    expect(analyzeForm(ideal({ depth: 0.29 }), 'squats').primaryIssue).toEqual({
      type: 'depth',
      severity: 'critical',
      current: 0.29,
      target: 0.85,
      cue: 'Go deeper!',
      priority: 2,
      confidence: 0.9,
    });
    expect(analyzeForm(ideal({ depth: 0.29 }), 'pushups').primaryIssue?.cue).toBe(
      'Lower down more!'
    );
  });

  it('is a warning between 0.3 and 0.6', () => {
    expect(analyzeForm(ideal({ depth: 0.5 }), 'squats').primaryIssue).toEqual({
      type: 'depth',
      severity: 'warning',
      current: 0.5,
      target: 0.85,
      cue: 'Add more depth',
      priority: 3,
      confidence: 0.85,
    });
    expect(analyzeForm(ideal({ depth: 0.5 }), 'pullups').primaryIssue?.cue).toBe('Extend further');
  });

  it('is positive info above 0.9, at the lowest priority', () => {
    const analysis = analyzeForm(ideal({ depth: 0.95, symmetry: 0.5 }), 'pullups');
    const depth = analysis.issues.find((issue) => issue.type === 'depth');
    expect(depth).toEqual({
      type: 'depth',
      severity: 'info',
      current: 0.95,
      target: 0.85,
      cue: 'Perfect depth!',
      priority: 99,
      confidence: 0.92,
    });
    // priority 99 must never become the primary issue
    expect(analysis.primaryIssue?.type).toBe('symmetry');
  });

  it('stays silent in the acceptable band', () => {
    expect(issueTypes(analyzeForm(ideal({ depth: 0.6 }), 'pushups'))).not.toContain('depth');
    expect(issueTypes(analyzeForm(ideal({ depth: 0.9 }), 'pushups'))).not.toContain('depth');
  });
});

describe('coaching engine — trunk lean', () => {
  it('is critical above 45° regardless of mode, targeting 15° by default', () => {
    const analysis = analyzeForm(ideal({ trunkLean: 50 }), 'pushups');
    expect(analysis.primaryIssue).toEqual({
      type: 'trunk_lean',
      severity: 'critical',
      current: 50,
      target: 15,
      cue: 'Stay upright!',
      priority: 2,
      confidence: 0.88,
    });
  });

  it('allows a 30° target for squats, so 20° is clean there but not in pushups', () => {
    expect(issueTypes(analyzeForm(ideal({ trunkLean: 20 }), 'squats'))).not.toContain('trunk_lean');
    expect(issueTypes(analyzeForm(ideal({ trunkLean: 20 }), 'pushups'))).toContain('trunk_lean');
  });

  it('warns above the mode target but at or below 45°', () => {
    expect(analyzeForm(ideal({ trunkLean: 35 }), 'squats').primaryIssue).toEqual({
      type: 'trunk_lean',
      severity: 'warning',
      current: 35,
      target: 30,
      cue: 'Reduce forward lean',
      priority: 3,
      confidence: 0.83,
    });
  });

  it('holds the same severity across modes once past the critical line', () => {
    // Critical is an absolute 45° line, so the mode target does not change it.
    expect(analyzeForm(ideal({ trunkLean: 35 }), 'pushups').primaryIssue?.severity).toBe('warning');
    expect(analyzeForm(ideal({ trunkLean: 50 }), 'squats').primaryIssue?.severity).toBe('critical');
  });

  it('is silent at exactly the target', () => {
    expect(issueTypes(analyzeForm(ideal({ trunkLean: 15 }), 'pushups'))).not.toContain(
      'trunk_lean'
    );
    expect(issueTypes(analyzeForm(ideal({ trunkLean: 30 }), 'squats'))).not.toContain('trunk_lean');
  });
});

describe('coaching engine — knee valgus', () => {
  it('is critical above 50°', () => {
    expect(analyzeForm(ideal({ kneeValgus: 60 }), 'squats').primaryIssue).toEqual({
      type: 'knee_valgus',
      severity: 'critical',
      current: 60,
      target: 20,
      cue: 'Push knees outward!',
      priority: 2,
      confidence: 0.86,
    });
  });

  it('warns between 30° and 50°', () => {
    expect(analyzeForm(ideal({ kneeValgus: 40 }), 'squats').primaryIssue).toEqual({
      type: 'knee_valgus',
      severity: 'warning',
      current: 40,
      target: 20,
      cue: 'Keep knees aligned',
      priority: 4,
      confidence: 0.81,
    });
  });

  it('is silent at exactly 30°', () => {
    expect(issueTypes(analyzeForm(ideal({ kneeValgus: 30 }), 'squats'))).not.toContain(
      'knee_valgus'
    );
  });
});

describe('coaching engine — ankle flexion', () => {
  it('only applies to squats', () => {
    for (const mode of ALL_MODES.filter((m) => m !== 'squats')) {
      expect(issueTypes(analyzeForm(ideal({ ankleFlexion: 10 }), mode))).not.toContain(
        'ankle_flexion'
      );
    }
  });

  it('is info-level below 60° with an 80° target', () => {
    expect(analyzeForm(ideal({ ankleFlexion: 45 }), 'squats').primaryIssue).toEqual({
      type: 'ankle_flexion',
      severity: 'info',
      current: 45,
      target: 80,
      cue: 'Improve ankle mobility',
      priority: 5,
      confidence: 0.75,
    });
  });
});

describe('coaching engine — symmetry', () => {
  it('warns below 0.7', () => {
    expect(analyzeForm(ideal({ symmetry: 0.6 }), 'pullups').primaryIssue).toEqual({
      type: 'symmetry',
      severity: 'warning',
      current: 0.6,
      target: 0.9,
      cue: 'Balance weight evenly',
      priority: 4,
      confidence: 0.79,
    });
  });

  it('is silent at exactly 0.7', () => {
    expect(issueTypes(analyzeForm(ideal({ symmetry: 0.7 }), 'pullups'))).not.toContain('symmetry');
  });
});

describe('coaching engine — aggregation', () => {
  it('sorts issues by ascending priority', () => {
    const analysis = analyzeForm(
      ideal({ isStable: false, symmetry: 0.2, trunkLean: 50, depth: 0.1 }),
      'squats'
    );
    // stability 1, depth 2 (critical, 0.1 < 0.3), trunk_lean 2 (> 45),
    // symmetry 4. No warning-tier depth issue: depth 0.1 is already critical.
    expect(analysis.issues.map((issue) => issue.priority)).toEqual([1, 2, 2, 4]);
  });

  it('averages issue confidences and reports 1.0 when clean', () => {
    const clean = analyzeForm(ideal(), 'pushups');
    expect(clean.confidence).toBe(1.0);
    expect(clean.issues).toEqual([]);
    expect(clean.primaryIssue).toBeNull();

    // stability 0.95 + knee_valgus 0.81 => mean 0.88
    const mixed = analyzeForm(ideal({ isStable: false, kneeValgus: 40 }), 'squats');
    expect(mixed.confidence).toBeCloseTo((0.81 + 0.95) / 2, 10);
    expect(mixed.confidence).toBeCloseTo(0.88, 10);
  });

  it('derives isForming from isStable alone', () => {
    expect(analyzeForm(ideal({ isStable: false }), 'pushups').isForming).toBe(true);
    expect(analyzeForm(ideal({ isStable: true }), 'pushups').isForming).toBe(false);
  });

  it('passes sessionTrend straight through', () => {
    expect(analyzeForm(ideal(), 'pushups', 'improving').sessionTrend).toBe('improving');
    expect(analyzeForm(ideal(), 'pushups').sessionTrend).toBeUndefined();
  });

  it('summarizes: clean form', () => {
    expect(analyzeForm(ideal(), 'pushups').summary).toBe('Excellent form!');
  });

  it('summarizes: a single critical issue wins over warnings', () => {
    expect(analyzeForm(ideal({ isStable: false, symmetry: 0.2 }), 'pushups').summary).toBe(
      'Stabilize your form!'
    );
  });

  it('summarizes: one warning', () => {
    expect(analyzeForm(ideal({ symmetry: 0.5 }), 'pushups').summary).toBe('Balance weight evenly');
  });

  it('summarizes: multiple warnings collapse into one line', () => {
    expect(analyzeForm(ideal({ symmetry: 0.5, kneeValgus: 40 }), 'squats').summary).toBe(
      'Fix: keep knees aligned (and 1 more)'
    );
  });

  it('summarizes: info-only feedback reads as perfect form', () => {
    expect(analyzeForm(ideal({ depth: 0.95 }), 'pullups').summary).toBe('Perfect form!');
  });
});

describe('coaching engine — legacy format', () => {
  it('maps a clean analysis to a silent acknowledgment', () => {
    expect(convertToLegacyFormat(analyzeForm(ideal(), 'pushups'))).toEqual({
      feedback: 'Great form!',
      severity: 'info',
      shouldSpeak: false,
    });
  });

  it('speaks for critical and warning issues', () => {
    const critical = convertToLegacyFormat(analyzeForm(ideal({ isStable: false }), 'pushups'));
    expect(critical).toEqual({
      feedback: 'Stabilize your form!',
      severity: 'critical',
      shouldSpeak: true,
    });

    const warning = convertToLegacyFormat(analyzeForm(ideal({ symmetry: 0.5 }), 'pushups'));
    expect(warning).toEqual({
      feedback: 'Balance weight evenly',
      severity: 'warning',
      shouldSpeak: true,
    });
  });

  it('does not speak for info-level praise', () => {
    expect(convertToLegacyFormat(analyzeForm(ideal({ depth: 0.95 }), 'pullups'))).toEqual({
      feedback: 'Perfect depth!',
      severity: 'info',
      shouldSpeak: false,
    });
  });
});
