// Export all custom hooks
export { useVerifiedCount } from './useVerifiedCount';
export type { UseVerifiedCountReturn } from './useVerifiedCount';
export {
  useTransition,
  useFadeTransition,
  useSlideTransition,
  useScaleTransition,
} from './useTransition';

// Data synchronization hooks (Phase 5)
export { useDataSync, useQuery, useMutation } from './useDataSync';
export type { UseDataSyncOptions, UseDataSyncReturn } from './useDataSync';

// Real leaderboard integration with DataSync
export {
  useSyncedLeaderboard,
  useSyncedScores,
  useSyncedFullLeaderboard,
} from './useSyncedLeaderboard';

// Notification system (Phase 2)
export { useNotification } from './useNotification';
export type { NotificationType } from './useNotification';

// Haptic feedback for mobile UX enhancement
export { useHapticFeedback } from './useHapticFeedback';

// Game state management
export { useGameState, useWorkoutTimer } from './useGameState';

// Session intent → aesthetic register (Train / Coach / Breathe)
export { useSessionIntent } from './useSessionIntent';

// Pose detection state
export { usePoseDetection } from './usePoseDetection';
export type { PoseState, DetectionProgress, DetectionPhase } from './usePoseDetection';

// Accessibility helpers
export { useAccessibility } from './useAccessibility';
export { useCameraSetup } from './useCameraSetup';
