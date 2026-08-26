'use client';

import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui';

interface LazyWebcamProps {
  mode?: import('@/utils/biomechanics').ExerciseMode;
  onRepCount?: (count: number) => void;
  isActive?: boolean;
  onFilterChange?: (filterName: string) => void;
  onPoseStateChange?: (state: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  }) => void;
  onDetectionProgress?: (progress: {
    phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
    message: string;
    percentage: number;
  }) => void;
  onMetrics?: (state: import('@/types/mediapipe').BiomechanicalState) => void;
  onCurlPoseData?: (poseData: import('@/types/mediapipe').CurlPoseData | undefined) => void;
  onSessionEnd?: (summary: import('@/services/sessionLogger').SessionSummary) => void;
  pbTrace?: import('@/types/workout').SessionSnapshot[];
  /** Progressive framing-readiness score during the pre-workout settling window. */
  onReadiness?: (score: import('@/lib/exercise-engine').ReadinessScore) => void;
}

/**
 * Lazy-loaded Webcam component that only loads TensorFlow when actually needed
 */
export default function LazyWebcam(props: LazyWebcamProps) {
  const [WebcamComponent, setWebcamComponent] =
    useState<React.ComponentType<LazyWebcamProps> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only load the heavy Webcam component when isActive becomes true
    if (props.isActive && !WebcamComponent && !isLoading) {
      setIsLoading(true);
      setError(null);

      // Dynamically import the heavy Webcam component
      import('./Webcam')
        .then((module) => {
          if (!module.default) {
            throw new Error('Webcam module has no default export');
          }
          setWebcamComponent(() => module.default as React.ComponentType<LazyWebcamProps>);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load Webcam component:', err);
          setError('Failed to load camera component');
          setIsLoading(false);
        });
    }
  }, [props.isActive, WebcamComponent, isLoading]);

  // Show loading state while component is being loaded
  if (props.isActive && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Spinner />
        <p className="text-yellow-400 mt-4 text-sm">Loading camera...</p>
      </div>
    );
  }

  // Show error state if loading failed
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(false);
            setWebcamComponent(null);
          }}
          className="mt-2 px-4 py-2 bg-yellow-600 text-black rounded text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render the actual Webcam component once loaded
  if (WebcamComponent && props.isActive) {
    // Defensive: ensure mode is never null/undefined
    const safeMode = props.mode ?? 'pushups';
    return (
      <WebcamComponent
        key={props.isActive ? 'webcam-active' : 'webcam-inactive'}
        mode={safeMode}
        onRepCount={props.onRepCount}
        isActive={props.isActive}
        onFilterChange={props.onFilterChange}
        onPoseStateChange={props.onPoseStateChange}
        onDetectionProgress={props.onDetectionProgress}
        onMetrics={props.onMetrics}
        onCurlPoseData={props.onCurlPoseData}
        onSessionEnd={props.onSessionEnd}
        pbTrace={props.pbTrace}
        onReadiness={props.onReadiness}
      />
    );
  }

  // Show placeholder when not active
  return (
    <div className="flex items-center justify-center h-full bg-gray-900 border-2 border-gray-700 rounded">
      <p className="text-gray-400 text-sm">Camera ready - press START to begin</p>
    </div>
  );
}
