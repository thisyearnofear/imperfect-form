'use client';

import { useState, useCallback } from 'react';
import type { BiomechanicalState, CurlPoseData } from '@/types/mediapipe';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DetectionPhase = 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';

export interface PoseState {
  hasCamera: boolean;
  hasPoseDetection: boolean;
  poseDetected: boolean;
  isLoading: boolean;
}

export interface DetectionProgress {
  phase: DetectionPhase;
  message: string;
  percentage: number;
}

interface UsePoseDetectionReturn {
  poseState: PoseState;
  detectionProgress: DetectionProgress | null;
  metrics: BiomechanicalState | null;
  curlPoseData: CurlPoseData | null;
  showLoadingOverlay: boolean;
  handlePoseStateChange: (state: PoseState) => void;
  handleDetectionProgress: (progress: DetectionProgress) => void;
  handleMetrics: (state: BiomechanicalState) => void;
  handleCurlPoseData: (poseData: CurlPoseData | undefined) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function usePoseDetection(): UsePoseDetectionReturn {
  const [poseState, setPoseState] = useState<PoseState>({
    hasCamera: false,
    hasPoseDetection: false,
    poseDetected: false,
    isLoading: false,
  });

  const [detectionProgress, setDetectionProgress] = useState<DetectionProgress | null>(null);
  const [metrics, setMetrics] = useState<BiomechanicalState | null>(null);
  const [curlPoseData, setCurlPoseData] = useState<CurlPoseData | null>(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  const handleDetectionProgress = useCallback((progress: DetectionProgress) => {
    if (progress.phase !== 'ready') {
      setShowLoadingOverlay(true);
    } else {
      setShowLoadingOverlay(false);
    }
    setDetectionProgress(progress);
  }, []);

  const handlePoseStateChange = useCallback((state: PoseState) => {
    setPoseState((prev) => {
      if (
        prev.isLoading === state.isLoading &&
        prev.hasCamera === state.hasCamera &&
        prev.hasPoseDetection === state.hasPoseDetection &&
        prev.poseDetected === state.poseDetected
      ) {
        return prev;
      }
      return state;
    });
  }, []);

  const handleMetrics = useCallback((state: BiomechanicalState) => {
    setMetrics(state);
  }, []);

  const handleCurlPoseData = useCallback((poseData: CurlPoseData | undefined) => {
    setCurlPoseData(poseData ?? null);
  }, []);

  return {
    poseState,
    detectionProgress,
    metrics,
    curlPoseData,
    showLoadingOverlay,
    handlePoseStateChange,
    handleDetectionProgress,
    handleMetrics,
    handleCurlPoseData,
  };
}

export default usePoseDetection;
