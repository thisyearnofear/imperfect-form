'use client';

import React from 'react';
import { GameHUD, RepFeedbackOverlay } from './GameHUD';
import { GameLoadingOverlay, DebugOverlay } from './GameOverlay';
import { LiveCoachingStatus } from './LiveCoachingStatus';
import { FirstRepCelebration } from './FirstRepCelebration';
import CoachTwinPeek from '@/components/theme/CoachTwinPeek';
import { PoseState, DetectionProgress } from '@/hooks/usePoseDetection';
import { useCoachingMoment } from '@/hooks/useCoachingMoment';

interface RepFeedback {
  show: boolean;
  count: number;
}

interface GameCanvasProps {
  mode: import('@/utils/biomechanics').ExerciseMode;
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
  showFirstRepCelebration?: boolean;
  metrics?: import('@/types/mediapipe').BiomechanicalState | null;
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
  showFirstRepCelebration = false,
  metrics = null,
}) => {
  const loadingPhase = !poseState.hasCamera
    ? 'camera'
    : !poseState.hasPoseDetection
      ? 'ai'
      : !poseState.poseDetected
        ? 'positioning'
        : 'ready';

  const isLoadingVisible = !poseState.hasPoseDetection || !poseState.poseDetected;
  const coachingMoment = useCoachingMoment(
    poseState.poseDetected,
    repCount,
    metrics?.warnings ?? []
  );

  const coachingStatusProps = {
    mode,
    tracking: poseState.poseDetected,
    repCount,
    warnings: metrics?.warnings,
    phase: coachingMoment.phase,
    warning: coachingMoment.warning,
    focusWarning: coachingMoment.focusWarning,
  };

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
          depth={metrics?.depth}
          warnings={metrics?.warnings}
        />
        <div
          id="canvasContainerMobile"
          aria-label="Game Canvas Mobile"
          className={`w-full relative flex-grow rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/50 ${isFullscreen ? 'video-container-fs' : ''} ${poseState.poseDetected ? 'is-tracking' : ''}`}
          style={{ width: '100%', minHeight: '300px' }}
        >
          {webcam}
          <GameLoadingOverlay
            phase={loadingPhase}
            progress={detectionProgress?.percentage}
            isVisible={isLoadingVisible}
          />
          <RepFeedbackOverlay show={repFeedback.show} count={repFeedback.count} />
          <FirstRepCelebration show={showFirstRepCelebration} />
          <DebugOverlay started={true} poseDetected={poseState.poseDetected} />
          <LiveCoachingStatus {...coachingStatusProps} />
        </div>
        <CoachTwinPeek session />
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
        depth={metrics?.depth}
        warnings={metrics?.warnings}
      />
      <div
        id="canvasContainerDesktop"
        aria-label="Game Canvas Desktop"
        className={`w-full relative flex-grow rounded-lg overflow-hidden border border-white/10 bg-black/50 ${poseState.poseDetected ? 'is-tracking' : ''}`}
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
        <FirstRepCelebration show={showFirstRepCelebration} />
        <LiveCoachingStatus {...coachingStatusProps} />
      </div>
      <CoachTwinPeek session />
    </div>
  );
};

export default GameCanvas;
