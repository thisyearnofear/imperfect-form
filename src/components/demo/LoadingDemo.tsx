'use client';

import React, { useState } from 'react';
import { UnifiedLoader } from '@/components/ui';

/**
 * Demo component to showcase the enhanced loading experience
 * This simulates the actual pose detection loading phases
 */
const LoadingDemo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [poseState, setPoseState] = useState({
    hasCamera: false,
    hasPoseDetection: false,
    poseDetected: false,
    isLoading: false,
  });

  const simulateLoadingPhases = () => {
    setIsVisible(true);
    setPoseState({
      hasCamera: false,
      hasPoseDetection: false,
      poseDetected: false,
      isLoading: true,
    });

    // Simulate camera setup (2 seconds)
    setTimeout(() => {
      setPoseState((prev) => ({ ...prev, hasCamera: true }));
    }, 2000);

    // Simulate AI loading (8 seconds - the long part)
    setTimeout(() => {
      setPoseState((prev) => ({ ...prev, hasPoseDetection: true }));
    }, 10000);

    // Simulate positioning phase (3 seconds)
    setTimeout(() => {
      setPoseState((prev) => ({ ...prev, poseDetected: true }));
    }, 13000);
  };

  const resetDemo = () => {
    setIsVisible(false);
    setPoseState({
      hasCamera: false,
      hasPoseDetection: false,
      poseDetected: false,
      isLoading: false,
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {!isVisible ? (
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-brass">Enhanced Loading Experience Demo</h1>
          <p className="text-gray-300 max-w-md">
            This demo shows the improved loading experience that fills the gap between exercise
            start and skeleton detection.
          </p>
          <button
            onClick={simulateLoadingPhases}
            className="bg-brass text-black px-6 py-3 rounded-lg font-bold hover:bg-brass-soft transition-colors"
          >
            Start Demo (13 seconds)
          </button>
        </div>
      ) : (
        <div className="w-full h-full">
          <UnifiedLoader
            phase={
              !poseState.hasCamera
                ? 'initial'
                : !poseState.hasPoseDetection
                  ? 'camera'
                  : !poseState.poseDetected
                    ? 'positioning'
                    : 'ready'
            }
            isVisible={isVisible}
            isOverlay={false}
            onComplete={() => {
              setTimeout(resetDemo, 2000); // Show completion for 2 seconds
            }}
          />

          {/* Demo controls */}
          <div className="fixed bottom-4 right-4 space-y-2">
            <button
              onClick={resetDemo}
              className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-400 transition-colors"
            >
              Reset Demo
            </button>
            <div className="text-xs text-gray-400 bg-black/50 p-2 rounded">
              Phase:{' '}
              {!poseState.hasCamera
                ? 'Initial'
                : !poseState.hasPoseDetection
                  ? 'AI Loading'
                  : !poseState.poseDetected
                    ? 'Positioning'
                    : 'Ready'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingDemo;
