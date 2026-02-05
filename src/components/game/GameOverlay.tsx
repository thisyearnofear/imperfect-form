import React from 'react';
import { UnifiedLoader } from '@/components/ui';

interface GameOverlayProps {
  phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
  progress?: number;
  isVisible: boolean;
  isOverlay?: boolean;
}

export const GameLoadingOverlay: React.FC<GameOverlayProps> = ({
  phase,
  progress,
  isVisible,
  isOverlay = true,
}) => {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isOverlay ? 'z-[90]' : 'z-20'}`}
    >
      <UnifiedLoader
        phase={phase}
        progress={progress}
        isVisible={isVisible}
        isOverlay={isOverlay}
      />
    </div>
  );
};

interface DebugOverlayProps {
  started: boolean;
  poseDetected: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ started, poseDetected }) => {
  if (process.env.NODE_ENV !== 'development' || !started || poseDetected) {
    return null;
  }

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded z-50">
      Debug: Overlay visible
    </div>
  );
};
