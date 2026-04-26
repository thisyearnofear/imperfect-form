import { NetworkType } from './score';
import { BiomechanicalState, Keypoint } from './mediapipe';

export interface SessionSnapshot {
  timestamp: number;
  metrics: BiomechanicalState;
  keypoints: Keypoint[];
}

/**
 * LocalWorkout - Standardized structure for locally stored workout sessions
 * This enables freemium usage where workouts are saved immediately for free,
 * and on-chain syncing is optional/deferred.
 */
export interface LocalWorkout {
  id: string; // Unique session ID
  reps: number;
  timestamp: number;
  synced: boolean;
  txHash?: string;
  network?: NetworkType;
  type: 'pushups' | 'squats';
  userAddress?: string; // Optional: associate with a specific wallet if connected
  trace?: SessionSnapshot[];
  hasTrace?: boolean;
}
