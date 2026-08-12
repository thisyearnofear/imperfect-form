'use client';

import React from 'react';
import { GameHUD, RepFeedbackOverlay } from './GameHUD';
import { GameLoadingOverlay, DebugOverlay } from './GameOverlay';
import { LiveCoachingStatus } from './LiveCoachingStatus';
import { FirstRepCelebration } from './FirstRepCelebration';
import CoachTwinPeek from '@/components/theme/CoachTwinPeek';
import { PoseState, DetectionProgress } from '@/hooks/usePoseDetection';
import { useCoachingMoment } from '@/hooks/useCoachingMoment';
import CurlFormInstrument from './CurlFormInstrument';
import { deriveCurlTelemetry } from '@/lib/curlTelemetry';

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
  isIOS?: boolean;
  poseState: PoseState;
  detectionProgress: DetectionProgress | null;
  webcam: React.ReactNode;
  showFirstRepCelebration?: boolean;
  /** A user-facing focus carried from the recap retry CTA; never drives robot commands. */
  retryFocus?: string | null;
  metrics?: import('@/types/mediapipe').BiomechanicalState | null;
  curlPoseData?: import('@/types/mediapipe').CurlPoseData | null;
  onFormScore?: (score: number) => void;
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
  isIOS = false,
  poseState,
  detectionProgress,
  webcam,
  showFirstRepCelebration = false,
  retryFocus = null,
  metrics = null,
  curlPoseData = null,
  onFormScore,
}) => {
  const loadingPhase = !poseState.hasCamera
    ? 'camera'
    : !poseState.hasPoseDetection
      ? 'ai'
      : !poseState.poseDetected
        ? 'positioning'
        : 'ready';

  const isLoadingVisible = !poseState.hasPoseDetection || !poseState.poseDetected;
  const qualityMessage =
    isMobile && detectionProgress?.qualityTier ? detectionProgress.message : null;
  const coachingMoment = useCoachingMoment(
    poseState.poseDetected,
    repCount,
    metrics?.warnings ?? []
  );

  const curlTelemetry =
    mode === 'curls' ? deriveCurlTelemetry(curlPoseData ?? undefined, metrics) : null;

  const coachingStatusProps = {
    mode,
    tracking: poseState.poseDetected,
    repCount,
    warnings: metrics?.warnings,
    phase: coachingMoment.phase,
    warning: coachingMoment.warning,
    focusWarning: coachingMoment.focusWarning,
    retryFocus,
    firstSignal: showFirstRepCelebration,
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
          className={`w-full relative flex-grow rounded-xl overflow-hidden shadow-lg border border-white/10 session-camera-stage session-camera-stage--mobile ${isIOS ? 'session-camera-stage--ios' : ''} ${isFullscreen ? 'video-container-fs' : ''} ${poseState.poseDetected ? 'is-tracking' : ''}`}
          style={{ width: '100%' }}
        >
          {webcam}
          <GameLoadingOverlay
            phase={loadingPhase}
            progress={detectionProgress?.percentage}
            isVisible={isLoadingVisible}
          />
          <RepFeedbackOverlay show={repFeedback.show} count={repFeedback.count} />
          <FirstRepCelebration show={showFirstRepCelebration} mode={mode} />
          <DebugOverlay started={true} poseDetected={poseState.poseDetected} />
          {qualityMessage && (
            <div
              className="mobile-quality-status"
              data-quality-tier={detectionProgress?.qualityTier}
              role="status"
              aria-live="polite"
            >
              {qualityMessage}
            </div>
          )}
          <LiveCoachingStatus {...coachingStatusProps} />
          {mode === 'curls' ? (
            <CurlFormInstrument
              telemetry={curlTelemetry}
              tracking={poseState.poseDetected}
              repCount={repCount}
              onFormScore={onFormScore}
            />
          ) : null}
        </div>
        <CoachTwinPeek session mode={mode} />
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
        className={`w-full relative flex-grow rounded-lg overflow-hidden border border-white/10 session-camera-stage ${poseState.poseDetected ? 'is-tracking' : ''}`}
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
        <FirstRepCelebration show={showFirstRepCelebration} mode={mode} />
        <LiveCoachingStatus {...coachingStatusProps} />
        {mode === 'curls' ? (
          <CurlFormInstrument
            telemetry={curlTelemetry}
            tracking={poseState.poseDetected}
            repCount={repCount}
          />
        ) : null}
      </div>
      <CoachTwinPeek session mode={mode} />
    </div>
  );
};

export default GameCanvas;
