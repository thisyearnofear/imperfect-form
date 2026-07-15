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
function analyzeStability(
  metrics: BiomechanicalState,
  mode: import('@/utils/biomechanics').ExerciseMode
): CoachingIssue | null {
  if (!metrics.isStable) {
    return {
      type: 'stability',
      severity: 'critical',
      current: 0,
      target: 1,
      cue: 'Stabilize your form!',
      priority: 1,
      confidence: 0.95,
    };
  }
  return null;
}

/**
 * Analyze depth (range of motion)
 */
function analyzeDepth(
  metrics: BiomechanicalState,
  mode: import('@/utils/biomechanics').ExerciseMode
): CoachingIssue | null {
  const { depth } = metrics;
  const target = 0.85;

  // Critical: Too shallow
  if (depth < 0.3) {
    const cue = mode === 'squats' ? 'Go deeper!' : 'Lower down more!';
    return {
      type: 'depth',
      severity: 'critical',
      current: depth,
      target,
      cue,
      priority: 2,
      confidence: 0.9,
    };
  }

  // Warning: Slightly shallow
  if (depth < 0.6) {
    const cue = mode === 'squats' ? 'Add more depth' : 'Extend further';
    return {
      type: 'depth',
      severity: 'warning',
      current: depth,
      target,
      cue,
      priority: 3,
      confidence: 0.85,
    };
  }

  // Info: Good depth
  if (depth > 0.9) {
    return {
      type: 'depth',
      severity: 'info',
      current: depth,
      target,
      cue: 'Perfect depth!',
      priority: 99, // Low priority (positive feedback)
      confidence: 0.92,
    };
  }

  return null;
}

/**
 * Analyze trunk lean (forward bend)
 */
function analyzeTrunkLean(
  metrics: BiomechanicalState,
  mode: import('@/utils/biomechanics').ExerciseMode
): CoachingIssue | null {
  const { trunkLean } = metrics;
  let target = 15; // Most exercise should be <15°

  if (mode === 'squats') {
    target = 30; // Squats allow more lean
  }

  // Critical: Extreme lean
  if (trunkLean > 45) {
    return {
      type: 'trunk_lean',
      severity: 'critical',
      current: trunkLean,
      target,
      cue: 'Stay upright!',
      priority: 2,
      confidence: 0.88,
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
      priority: 3,
      confidence: 0.83,
    };
  }

  return null;
}

/**
 * Analyze knee alignment (valgus = inward collapse)
 */
function analyzeKneeValgus(
  metrics: BiomechanicalState,
  mode: import('@/utils/biomechanics').ExerciseMode
): CoachingIssue | null {
  const { kneeValgus } = metrics;
  const target = 20;

  // Critical: Severe inward collapse
  if (kneeValgus > 50) {
    return {
      type: 'knee_valgus',
      severity: 'critical',
      current: kneeValgus,
      target,
      cue: 'Push knees outward!',
      priority: 2,
      confidence: 0.86,
    };
  }

  // Warning: Noticeable collapse
  if (kneeValgus > 30) {
    return {
      type: 'knee_valgus',
      severity: 'warning',
      current: kneeValgus,
      target,
      cue: 'Keep knees aligned',
      priority: 4,
      confidence: 0.81,
    };
  }

  return null;
}

/**
 * Analyze ankle mobility (for squats)
 */
function analyzeAnkleFlexion(
  metrics: BiomechanicalState,
  mode: import('@/utils/biomechanics').ExerciseMode
): CoachingIssue | null {
  if (mode !== 'squats') return null; // Only relevant for squats

  const { ankleFlexion } = metrics;
  const target = 80; // Ideal: ~80°

  if (ankleFlexion < 60) {
    return {
      type: 'ankle_flexion',
      severity: 'info',
      current: ankleFlexion,
      target,
      cue: 'Improve ankle mobility',
      priority: 5,
      confidence: 0.75,
    };
  }

  return null;
}

/**
 * Analyze symmetry (left/right balance)
 */
function analyzeSymmetry(
  metrics: BiomechanicalState,
  mode: import('@/utils/biomechanics').ExerciseMode
): CoachingIssue | null {
  const { symmetry } = metrics;
  const target = 0.9; // >0.9 = balanced

  if (symmetry < 0.7) {
    return {
      type: 'symmetry',
      severity: 'warning',
      current: symmetry,
      target,
      cue: 'Balance weight evenly',
      priority: 4,
      confidence: 0.79,
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
  mode: import('@/utils/biomechanics').ExerciseMode,
  sessionTrend?: 'improving' | 'degrading' | 'stable'
): CoachingAnalysis {
  const allIssues: CoachingIssue[] = [
    analyzeStability(metrics, mode),
    analyzeDepth(metrics, mode),
    analyzeTrunkLean(metrics, mode),
    analyzeKneeValgus(metrics, mode),
    analyzeAnkleFlexion(metrics, mode),
    analyzeSymmetry(metrics, mode),
  ].filter((issue): issue is CoachingIssue => issue !== null);

  // Sort by priority (lower = more critical)
  allIssues.sort((a, b) => a.priority - b.priority);

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

/**
 * Filter issues for UI display (limit to top 3)
 */
export function getDisplayIssues(analysis: CoachingAnalysis, limit: number = 3): CoachingIssue[] {
  return analysis.issues.slice(0, limit);
}

/**
 * Check if form is critically degraded (multiple critical issues)
 */
export function isCriticalForm(analysis: CoachingAnalysis): boolean {
  const criticalCount = analysis.issues.filter((i) => i.severity === 'critical').length;
  return criticalCount >= 2;
}
