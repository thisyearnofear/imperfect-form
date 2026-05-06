'use client';

import React from 'react';
import { GameHUD, RepFeedbackOverlay } from './GameHUD';
import { GameLoadingOverlay, DebugOverlay } from './GameOverlay';
import { PoseState, DetectionProgress } from '@/hooks/usePoseDetection';

interface RepFeedback {
  show: boolean;
  count: number;
}

interface GameCanvasProps {
  mode: 'pushups' | 'squats';
  timeLeft: number;
  repCount: number;
  repFeedback: RepFeedback;
  formatTime: (sec: number) => string;
  isFullscreen: boolean;
  isRace: boolean;
  isMobile: boolean;
  poseState: PoseState;
  detectionProgress: DetectionProgress | null;
  webcam: React.ReactNode;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  timeLeft,
  repCount,
  repFeedback,
  formatTime,
  isFullscreen,
  isRace,
  isMobile,
  poseState,
  detectionProgress,
  webcam,
}) => {
  const loadingPhase = !poseState.hasCamera
    ? 'camera'
    : !poseState.hasPoseDetection
      ? 'ai'
      : !poseState.poseDetected
        ? 'positioning'
        : 'ready';

  const isLoadingVisible = !poseState.hasPoseDetection || !poseState.poseDetected;

  if (isMobile) {
    return (
      <div className="w-full flex flex-col items-center justify-start relative h-full">
        <GameHUD
          mode={mode}
          timeLeft={timeLeft}
          repCount={repCount}
          formatTime={formatTime}
          isOverlay={isFullscreen}
          isRace={isRace}
        />
        <div
          id="canvasContainerMobile"
          aria-label="Game Canvas Mobile"
          className={`w-full relative flex-grow rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/50 ${isFullscreen ? 'video-container-fs' : ''}`}
          style={{ width: '100%', minHeight: '300px' }}
        >
          {webcam}
          <GameLoadingOverlay
            phase={loadingPhase}
            progress={detectionProgress?.percentage}
            isVisible={isLoadingVisible}
          />
          <RepFeedbackOverlay show={repFeedback.show} count={repFeedback.count} />
          <DebugOverlay started={true} poseDetected={poseState.poseDetected} />
          <div
            className={`pose-status-indicator ${poseState.poseDetected ? 'detected' : 'not-detected'}`}
          >
            {poseState.poseDetected ? '👤 POSE DETECTED' : '⚠️ NO POSE DETECTED'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-start relative">
      <GameHUD
        mode={mode}
        timeLeft={timeLeft}
        repCount={repCount}
        formatTime={formatTime}
        isOverlay={false}
        isRace={isRace}
      />
      <div
        id="canvasContainerDesktop"
        aria-label="Game Canvas Desktop"
        className="w-full relative flex-grow rounded-lg overflow-hidden border border-white/10 bg-black/50"
      >
        {webcam}
        <GameLoadingOverlay
          phase={loadingPhase}
          progress={detectionProgress?.percentage}
          isVisible={isLoadingVisible}
          isOverlay={true}
        />
        <DebugOverlay started={true} poseDetected={poseState.poseDetected} />
        <RepFeedbackOverlay show={repFeedback.show} count={repFeedback.count} />
      </div>
    </div>
  );
};

export default GameCanvas;
