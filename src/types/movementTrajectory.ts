export type MovementTrajectoryConfidence =
  'insufficient-data' | 'early-estimate' | 'emerging-trend' | 'reliable-trend';

export type MovementTrajectoryDirection = 'up' | 'flat' | 'down' | 'unknown';

export type MovementTrajectoryDimension = 'range' | 'control';

export type MovementTrajectoryLatestStatus =
  'none' | 'included' | 'inconclusive' | 'low-confidence';

export interface MovementNextUnlock {
  dimension: MovementTrajectoryDimension | null;
  label: string;
  practiceFocus: string;
  currentValue: number | null;
  /** Reserved for a future validated milestone; not shown as a numeric target yet. */
  targetValue: number | null;
}

/**
 * A local, protocol-specific direction of travel. This is not a forecast,
 * health score, population comparison, or promise of future ability.
 */
export interface MovementTrajectory {
  protocolId: string;
  qualifyingReads: number;
  totalValidReads: number;
  confidence: MovementTrajectoryConfidence;
  direction: MovementTrajectoryDirection;
  trendDimension: MovementTrajectoryDimension | null;
  trendPerWeek: number | null;
  currentValue: number | null;
  previousValue: number | null;
  repeatability: number | null;
  latestStatus: MovementTrajectoryLatestStatus;
  nextUnlock: MovementNextUnlock;
  retestDays: number;
}
