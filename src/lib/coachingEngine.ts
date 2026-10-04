/**
 * Unified Coaching Engine
 *
 * Single source of truth for ALL feedback generation logic.
 * Eliminates duplication between frontend and backend.
 *
 * Core Principles:
 * - DRY: One place to rules and heuristics
 * - Modular: Pure functions, no side effects
 * - Extensible: Easy to add new metric analysis
 */

import { BiomechanicalState } from '@/types/mediapipe';
import type { ExerciseMode } from '@/utils/biomechanics';
import { buildVerdict, gateFail, gatePass, type GateResult, type GateVerdict } from '@/lib/gates';

/**
 * Every threshold the form checks judge against, in one reviewable table.
 *
 * These numbers are asserted by src/lib/coachingEngine.test.ts and restated in
 * docs/COACH_GATES.md; change one and you must change all three.
 */
export const FORM_CHECK_THRESHOLDS = {
  /** Normalized range-of-motion 0-1. Skipped for curls, which have their own instrument. */
  depth: { critical: 0.3, warning: 0.6, target: 0.85, good: 0.9 },
  /** Degrees of forward trunk lean. Squats tolerate more. */
  trunkLean: { warning: 15, squatsWarning: 30, critical: 45 },
  /** Degrees of inward knee collapse. */
  kneeValgus: { warning: 30, critical: 50, target: 20 },
  /** Ankle angle in degrees. Squats only. */
  ankleFlexion: { info: 60, target: 80 },
  /** Left/right balance, 1 = even. */
  symmetry: { warning: 0.7, target: 0.9 },
} as const;

/** Confidence per issue, reflecting how much the signal is trusted. */
export const FORM_CHECK_CONFIDENCE = {
  stability: 0.95,
  depthCritical: 0.9,
  depthWarning: 0.85,
  depthGood: 0.92,
  trunkLeanCritical: 0.88,
  trunkLeanWarning: 0.83,
  kneeValgusCritical: 0.86,
  kneeValgusWarning: 0.81,
  ankleFlexion: 0.75,
  symmetry: 0.79,
} as const;

/** Priority 1 is addressed first; 99 is positive feedback that never leads. */
export const FORM_CHECK_PRIORITY = {
  critical: 2,
  warning: 3,
  kneeValgusWarning: 4,
  symmetryWarning: 4,
  ankleFlexion: 5,
  positive: 99,
} as const;

/**
 * Individual form issue identified by the coaching engine
 */
export interface CoachingIssue {
  type:
    | 'stability'
    | 'depth'
    | 'trunk_lean'
    | 'knee_valgus'
    | 'ankle_flexion'
    | 'symmetry'
    | 'momentum'
    | 'recovery';
  severity: 'critical' | 'warning' | 'info';
  current: number; // Current metric value
  target: number; // Target/ideal metric value
  cue: string; // Actionable feedback
  priority: number; // 1=highest (address first)
  confidence: number; // 0-1, how confident in this issue
  isImproving?: boolean; // Trend indicator (for multi-rep context)
}

/**
 * Complete coaching response
 */
export interface CoachingAnalysis {
  issues: CoachingIssue[];
  summary: string; // One-liner for voice output
  primaryIssue: CoachingIssue | null; // Top priority issue
  isForming: boolean; // Rep is in transition state
  confidence: number; // Overall confidence in analysis (avg)
  sessionTrend?: 'improving' | 'degrading' | 'stable';
}

/**
 * Analyze stability (isStable, warnings)
 */
function analyzeStability(metrics: BiomechanicalState, _mode: ExerciseMode): CoachingIssue | null {
  if (!metrics.isStable) {
    return {
      type: 'stability',
      severity: 'critical',
      current: 0,
      target: 1,
      cue: 'Stabilize your form!',
      priority: 1,
      confidence: FORM_CHECK_CONFIDENCE.stability,
    };
  }
  return null;
}

/**
 * Analyze depth (range of motion)
 */
function analyzeDepth(metrics: BiomechanicalState, mode: ExerciseMode): CoachingIssue | null {
  // Curls have a dedicated angle/range instrument in the live session. Do not
  // compete with it using the generic depth copy ("Lower down more").
  if (mode === 'curls') return null;

  const { depth } = metrics;
  const { critical, warning, target, good } = FORM_CHECK_THRESHOLDS.depth;

  // Critical: Too shallow
  if (depth < critical) {
    const cue = mode === 'squats' ? 'Go deeper!' : 'Lower down more!';
    return {
      type: 'depth',
      severity: 'critical',
      current: depth,
      target,
      cue,
      priority: FORM_CHECK_PRIORITY.critical,
      confidence: FORM_CHECK_CONFIDENCE.depthCritical,
    };
  }

  // Warning: Slightly shallow
  if (depth < warning) {
    const cue = mode === 'squats' ? 'Add more depth' : 'Extend further';
    return {
      type: 'depth',
      severity: 'warning',
      current: depth,
      target,
      cue,
      priority: FORM_CHECK_PRIORITY.warning,
      confidence: FORM_CHECK_CONFIDENCE.depthWarning,
    };
  }

  // Info: Good depth
  if (depth > good) {
    return {
      type: 'depth',
      severity: 'info',
      current: depth,
      target,
      cue: 'Perfect depth!',
      priority: FORM_CHECK_PRIORITY.positive,
      confidence: FORM_CHECK_CONFIDENCE.depthGood,
    };
  }

  return null;
}

/**
 * Analyze trunk lean (forward bend)
 */
function analyzeTrunkLean(metrics: BiomechanicalState, mode: ExerciseMode): CoachingIssue | null {
  const { trunkLean } = metrics;
  const { warning, squatsWarning, critical } = FORM_CHECK_THRESHOLDS.trunkLean;

  // Squats allow more lean than the default.
  const target = mode === 'squats' ? squatsWarning : warning;

  // Critical: Extreme lean
  if (trunkLean > critical) {
    return {
      type: 'trunk_lean',
      severity: 'critical',
      current: trunkLean,
      target,
      cue: 'Stay upright!',
      priority: FORM_CHECK_PRIORITY.critical,
      confidence: FORM_CHECK_CONFIDENCE.trunkLeanCritical,
    };
  }

  // Warning: Noticeable lean
  if (trunkLean > target) {
    return {
      type: 'trunk_lean',
      severity: 'warning',
      current: trunkLean,
      target,
      cue: 'Reduce forward lean',
      priority: FORM_CHECK_PRIORITY.warning,
      confidence: FORM_CHECK_CONFIDENCE.trunkLeanWarning,
    };
  }

  return null;
}

/**
 * Analyze knee alignment (valgus = inward collapse)
 */
function analyzeKneeValgus(metrics: BiomechanicalState, _mode: ExerciseMode): CoachingIssue | null {
  const { kneeValgus } = metrics;
  const { warning, critical, target } = FORM_CHECK_THRESHOLDS.kneeValgus;

  // Critical: Severe inward collapse
  if (kneeValgus > critical) {
    return {
      type: 'knee_valgus',
      severity: 'critical',
      current: kneeValgus,
      target,
      cue: 'Push knees outward!',
      priority: FORM_CHECK_PRIORITY.critical,
      confidence: FORM_CHECK_CONFIDENCE.kneeValgusCritical,
    };
  }

  // Warning: Noticeable collapse
  if (kneeValgus > warning) {
    return {
      type: 'knee_valgus',
      severity: 'warning',
      current: kneeValgus,
      target,
      cue: 'Keep knees aligned',
      priority: FORM_CHECK_PRIORITY.kneeValgusWarning,
      confidence: FORM_CHECK_CONFIDENCE.kneeValgusWarning,
    };
  }

  return null;
}

/**
 * Analyze ankle mobility (for squats)
 */
function analyzeAnkleFlexion(
  metrics: BiomechanicalState,
  mode: ExerciseMode
): CoachingIssue | null {
  if (mode !== 'squats') return null; // Only relevant for squats

  const { ankleFlexion } = metrics;
  const { info, target } = FORM_CHECK_THRESHOLDS.ankleFlexion;

  if (ankleFlexion < info) {
    return {
      type: 'ankle_flexion',
      severity: 'info',
      current: ankleFlexion,
      target,
      cue: 'Improve ankle mobility',
      priority: FORM_CHECK_PRIORITY.ankleFlexion,
      confidence: FORM_CHECK_CONFIDENCE.ankleFlexion,
    };
  }

  return null;
}

/**
 * Analyze symmetry (left/right balance)
 */
function analyzeSymmetry(metrics: BiomechanicalState, _mode: ExerciseMode): CoachingIssue | null {
  const { symmetry } = metrics;
  const { warning, target } = FORM_CHECK_THRESHOLDS.symmetry;

  if (symmetry < warning) {
    return {
      type: 'symmetry',
      severity: 'warning',
      current: symmetry,
      target,
      cue: 'Balance weight evenly',
      priority: FORM_CHECK_PRIORITY.symmetryWarning,
      confidence: FORM_CHECK_CONFIDENCE.symmetry,
    };
  }

  return null;
}

/**
 * Generate one-liner summary from issues
 */
function generateSummary(issues: CoachingIssue[]): string {
  if (issues.length === 0) {
    return 'Excellent form!';
  }

  const critical = issues.find((i) => i.severity === 'critical');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (critical) {
    return critical.cue;
  }

  if (warnings.length > 0) {
    if (warnings.length === 1) {
      return warnings[0].cue;
    }
    return `Fix: ${warnings[0].cue.toLowerCase()} (and ${warnings.length - 1} more)`;
  }

  // All info-level (positive feedback)
  return 'Perfect form!';
}

/** Every analyzer, in the order issues are collected before the priority sort. */
const ANALYZERS = [
  analyzeStability,
  analyzeDepth,
  analyzeTrunkLean,
  analyzeKneeValgus,
  analyzeAnkleFlexion,
  analyzeSymmetry,
] as const;

/**
 * Run every analyzer and return the issues sorted by ascending priority.
 * Single source of truth for both analyzeForm and evaluateFormGates.
 */
function collectIssues(metrics: BiomechanicalState, mode: ExerciseMode): CoachingIssue[] {
  const issues = ANALYZERS.map((analyze) => analyze(metrics, mode)).filter(
    (issue): issue is CoachingIssue => issue !== null
  );

  // Sort by priority (lower = more critical)
  issues.sort((a, b) => a.priority - b.priority);
  return issues;
}

/**
 * Gate form metrics, reporting each check with its measured value and limit.
 *
 * Unlike analyzeForm — which returns whichever issues fired — this returns every
 * gate including the passing ones, so a clean rep is auditable rather than an
 * empty array. Severity maps onto gate status: critical/warning are failures,
 * info is a pass, and a check that does not apply to this mode is `no-data`.
 *
 * A clean form therefore yields `passes`; a form issue yields `reviewable`; a
 * metric the engine cannot see for this mode yields `insufficient-data`.
 */
export function evaluateFormGates(metrics: BiomechanicalState, mode: ExerciseMode): GateVerdict {
  const issues = collectIssues(metrics, mode);
  const byType = new Map(issues.map((issue) => [issue.type, issue]));
  const T = FORM_CHECK_THRESHOLDS;
  const leanLimit = mode === 'squats' ? T.trunkLean.squatsWarning : T.trunkLean.warning;

  // Built in issue-priority order so the first non-passing gate is also the
  // highest-priority problem, not merely whichever check was listed first.
  const gates: GateResult[] = [
    metrics.isStable
      ? gatePass('stability', 'stable rep', 1, 'isStable = true')
      : gateFail('stability', 'stable rep', 0, 'isStable = true', 'The rep is not stable yet.'),
    gateForIssue(byType.get('depth'), metrics.depth, {
      id: 'depth',
      name: 'range of motion',
      limit: `${T.depth.critical}-${T.depth.good}`,
      failure: `Depth is outside ${T.depth.critical}-${T.depth.good}.`,
    }),
    gateForIssue(byType.get('trunk_lean'), metrics.trunkLean, {
      id: 'trunk_lean',
      name: 'trunk lean',
      limit: `<= ${leanLimit} deg`,
      failure: `Trunk lean exceeds ${leanLimit} degrees.`,
    }),
    gateForIssue(byType.get('knee_valgus'), metrics.kneeValgus, {
      id: 'knee_valgus',
      name: 'knee valgus',
      limit: `<= ${T.kneeValgus.warning} deg`,
      failure: `Knees collapse inward past ${T.kneeValgus.warning} degrees.`,
    }),
    gateForIssue(byType.get('ankle_flexion'), metrics.ankleFlexion, {
      id: 'ankle_flexion',
      name: 'ankle mobility',
      limit: `>= ${T.ankleFlexion.info} deg`,
      failure: `Ankle flexion below ${T.ankleFlexion.info} degrees.`,
    }),
    gateForIssue(byType.get('symmetry'), metrics.symmetry, {
      id: 'symmetry',
      name: 'left/right balance',
      limit: `>= ${T.symmetry.warning}`,
      failure: `Left/right balance below ${T.symmetry.warning}.`,
    }),
  ];

  // Depth is not graded for curls, which have a dedicated elbow-angle
  // instrument in the live session, and ankle mobility is only observable in a
  // squat. Drop the checks this exercise cannot answer rather than report a
  // pass for something that was never measured.
  return buildVerdict(
    gates.filter((gate) => {
      if (gate.id === 'depth') return mode !== 'curls';
      if (gate.id === 'ankle_flexion') return mode === 'squats';
      return true;
    })
  );
}

/**
 * Map a fired issue onto a gate. When no issue fired, the check passed, and the
 * gate records the value that was actually measured — a pass that reports 0
 * would be indistinguishable from a real zero reading.
 */
function gateForIssue(
  issue: CoachingIssue | undefined,
  measured: number,
  spec: { id: string; name: string; limit: string; failure: string }
): GateResult {
  if (!issue) {
    return gatePass(spec.id, spec.name, measured, spec.limit);
  }
  if (issue.severity === 'info') {
    return gatePass(spec.id, spec.name, issue.current, spec.limit);
  }
  return gateFail(spec.id, spec.name, issue.current, spec.limit, `${issue.cue} ${spec.failure}`);
}

/**
 * Main analysis function - unified single source of truth
 *
 * @param metrics - Current biomechanical state
 * @param mode - Exercise type (pushups | squats)
 * @param sessionTrend - Optional trend indicator from session history
 * @returns Complete coaching analysis with prioritized issues
 */
export function analyzeForm(
  metrics: BiomechanicalState,
  mode: ExerciseMode,
  sessionTrend?: 'improving' | 'degrading' | 'stable'
): CoachingAnalysis {
  const allIssues = collectIssues(metrics, mode);

  // Calculate overall confidence
  const confidence =
    allIssues.length > 0
      ? allIssues.reduce((sum, issue) => sum + issue.confidence, 0) / allIssues.length
      : 1.0;

  const primaryIssue = allIssues.length > 0 ? allIssues[0] : null;

  return {
    issues: allIssues,
    summary: generateSummary(allIssues),
    primaryIssue,
    isForming: metrics.isStable === false, // Still transitioning between reps
    confidence,
    sessionTrend,
  };
}

/**
 * Convert CoachingAnalysis to legacy single-message format
 * Used for backward compatibility during migration
 */
export function convertToLegacyFormat(analysis: CoachingAnalysis): {
  feedback: string;
  severity: 'info' | 'warning' | 'critical';
  shouldSpeak: boolean;
} {
  if (!analysis.primaryIssue) {
    return {
      feedback: 'Great form!',
      severity: 'info',
      shouldSpeak: false,
    };
  }

  return {
    feedback: analysis.primaryIssue.cue,
    severity: analysis.primaryIssue.severity,
    shouldSpeak:
      analysis.primaryIssue.severity === 'critical' || analysis.primaryIssue.severity === 'warning',
  };
}
