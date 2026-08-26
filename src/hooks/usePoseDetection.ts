'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { BiomechanicalState, CurlPoseData } from '@/types/mediapipe';
import type { MobileQualityTier } from '@/lib/pose/mobileQuality';
import type { ReadinessScore } from '@/lib/exercise-engine';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DetectionPhase = 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';

const LIVE_UI_UPDATE_INTERVAL_MS = 50;

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
  qualityTier?: MobileQualityTier;
}

interface UsePoseDetectionReturn {
  poseState: PoseState;
  detectionProgress: DetectionProgress | null;
  metrics: BiomechanicalState | null;
  curlPoseData: CurlPoseData | null;
  /** Latest framing-readiness score during the pre-workout settling window. */
  readiness: ReadinessScore | null;
  showLoadingOverlay: boolean;
  handlePoseStateChange: (state: PoseState) => void;
  handleDetectionProgress: (progress: DetectionProgress) => void;
  handleMetrics: (state: BiomechanicalState) => void;
  handleCurlPoseData: (poseData: CurlPoseData | undefined) => void;
  handleReadiness: (score: ReadinessScore) => void;
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
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const latestMetricsRef = useRef<BiomechanicalState | null>(null);
  const latestCurlPoseDataRef = useRef<CurlPoseData | null>(null);
  const liveUiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLiveUiUpdateRef = useRef(0);

  const publishLiveUiState = useCallback(() => {
    liveUiTimerRef.current = null;
    const elapsed = performance.now() - lastLiveUiUpdateRef.current;
    if (elapsed < LIVE_UI_UPDATE_INTERVAL_MS) {
      liveUiTimerRef.current = setTimeout(publishLiveUiState, LIVE_UI_UPDATE_INTERVAL_MS - elapsed);
      return;
    }

    lastLiveUiUpdateRef.current = performance.now();
    setMetrics(latestMetricsRef.current);
    setCurlPoseData(latestCurlPoseDataRef.current);
  }, []);

  const scheduleLiveUiState = useCallback(() => {
    if (liveUiTimerRef.current !== null) return;
    const elapsed = performance.now() - lastLiveUiUpdateRef.current;
    liveUiTimerRef.current = setTimeout(
      publishLiveUiState,
      Math.max(0, LIVE_UI_UPDATE_INTERVAL_MS - elapsed)
    );
  }, [publishLiveUiState]);

  useEffect(() => {
    return () => {
      if (liveUiTimerRef.current !== null) {
        clearTimeout(liveUiTimerRef.current);
        liveUiTimerRef.current = null;
      }
      latestMetricsRef.current = null;
      latestCurlPoseDataRef.current = null;
      lastLiveUiUpdateRef.current = 0;
    };
  }, []);

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

  const handleMetrics = useCallback(
    (state: BiomechanicalState) => {
      latestMetricsRef.current = state;
      scheduleLiveUiState();
    },
    [scheduleLiveUiState]
  );

  const handleCurlPoseData = useCallback(
    (poseData: CurlPoseData | undefined) => {
      latestCurlPoseDataRef.current = poseData ?? null;
      scheduleLiveUiState();
    },
    [scheduleLiveUiState]
  );

  // Readiness is already throttled (~2Hz) and change-detected upstream in the
  // detection loop, so a direct state set is safe here.
  const handleReadiness = useCallback((score: ReadinessScore) => {
    setReadiness(score);
  }, []);

  return {
    poseState,
    detectionProgress,
    metrics,
    curlPoseData,
    readiness,
    showLoadingOverlay,
    handlePoseStateChange,
    handleDetectionProgress,
    handleMetrics,
    handleCurlPoseData,
    handleReadiness,
  };
}

export default usePoseDetection;
