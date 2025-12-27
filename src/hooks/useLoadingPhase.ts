import { useMemo } from 'react';

export type LoadingPhase = 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';

interface PoseState {
  hasCamera: boolean;
  hasPoseDetection: boolean;
  poseDetected: boolean;
}

/**
 * Single source of truth for loading phase progression
 * DRY: Eliminates duplicate phase logic spread across components
 * CLEAN: Explicit dependencies passed in, single responsibility
 */
export function useLoadingPhase(poseState: PoseState): LoadingPhase {
  return useMemo(() => {
    if (!poseState.hasCamera) return 'initial';
    if (!poseState.hasPoseDetection) return 'ai';
    if (!poseState.poseDetected) return 'positioning';
    return 'ready';
  }, [poseState.hasCamera, poseState.hasPoseDetection, poseState.poseDetected]);
}
