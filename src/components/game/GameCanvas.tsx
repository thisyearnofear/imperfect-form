'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { GameHUD, RepFeedbackOverlay } from './GameHUD';
import { GameLoadingOverlay, DebugOverlay } from './GameOverlay';
import { LiveCoachingStatus } from './LiveCoachingStatus';
import { FirstRepCelebration } from './FirstRepCelebration';
import CoachTwinPeek from '@/components/theme/CoachTwinPeek';
import { PoseState, DetectionProgress } from '@/hooks/usePoseDetection';
import { useCoachingMoment } from '@/hooks/useCoachingMoment';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import { useStableTracking } from '@/hooks/useStableTracking';
import { isTwinHeroActive, useCoachTwin } from '@/hooks/useCoachTwin';
import FramingGhost from '@/components/receive/FramingGhost';
import LiveJointInset from '@/components/receive/LiveJointInset';
import CurlFormInstrument from './CurlFormInstrument';
import { SeeShowMoment } from './SeeShowMoment';
import { ReadinessHint } from './ReadinessHint';
import { deriveCurlTelemetry } from '@/lib/curlTelemetry';
import { readQuality, type ReadLevel } from '@/lib/readQuality';
import '@/styles/session-bay.css';

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
  /** Progressive framing-readiness score during the pre-workout settling window. */
  readiness?: import('@/lib/exercise-engine').ReadinessScore | null;
  webcam: React.ReactNode;
  showFirstRepCelebration?: boolean;
  /** A user-facing focus carried from the recap retry CTA; never drives robot commands. */
  retryFocus?: string | null;
  metrics?: import('@/types/mediapipe').BiomechanicalState | null;
  curlPoseData?: import('@/types/mediapipe').CurlPoseData | null;
  onFormScore?: (score: number) => void;
  /** Subtle baked-in rotate hint for portrait sessions (P6). */
  showRotateHint?: boolean;
  onDismissRotateHint?: () => void;
  /** Gentle persistent exit for the pain-ICP — routes to the designed
   *  PainExit surface, never an error (docs/PHASE_B_PLAN §B2). */
  onPainExit?: () => void;
  /** Reading mode: fixed-protocol rep target for the HUD pip counter. */
  readingTargetReps?: number | null;
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
  readiness = null,
  webcam,
  showFirstRepCelebration = false,
  retryFocus = null,
  metrics = null,
  curlPoseData = null,
  onFormScore,
  showRotateHint = false,
  onDismissRotateHint,
  onPainExit,
  readingTargetReps = null,
}) => {
  const [hasLockedPose, setHasLockedPose] = useState(false);
  useEffect(() => {
    if (poseState.poseDetected) setHasLockedPose(true);
  }, [poseState.poseDetected]);

  // The framing ghost holds one beat past the first lock so its fade can
  // land — then it unmounts instead of idling invisible on the stage.
  const [ghostGone, setGhostGone] = useState(false);
  useEffect(() => {
    if (!hasLockedPose || ghostGone) return;
    const t = setTimeout(() => setGhostGone(true), 650);
    return () => clearTimeout(t);
  }, [hasLockedPose, ghostGone]);
  // Reading sessions only: the plate figure is the framing target until
  // the pose locks. Non-reading sessions keep the plain boot loader.
  const showFramingGhost = readingTargetReps != null && !ghostGone;

  // Reach readings: the engine already computes arm elevation
  // (shoulder→elbow angle from straight-down — reachProcessor.readArm) and
  // publishes it on the poseData shoulder-angle channels, so the live
  // joint inset lights with the same numbers the rep counter uses.
  // Keypoints never cross into the React render path.
  const reachElevationDeg = React.useMemo(() => {
    if (mode !== 'reach' || !curlPoseData) return null;
    const direct = curlPoseData.activeShoulderAngle ?? curlPoseData.observedShoulderAngle;
    if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
    const arms = [curlPoseData.leftShoulderAngle, curlPoseData.rightShoulderAngle].filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v)
    );
    return arms.length ? Math.max(...arms) : null;
  }, [mode, curlPoseData]);

  // Once the pose locks and the ghost retires, a small anatomical inset
  // stays in the corner of the stage — the live "what the muscle is
  // doing" readout for the read itself.
  const showJointInset = mode === 'reach' && readingTargetReps != null && hasLockedPose;

  const loadingPhase = !poseState.hasCamera
    ? 'camera'
    : !poseState.hasPoseDetection
      ? 'ai'
      : !hasLockedPose && !poseState.poseDetected
        ? 'positioning'
        : 'ready';

  // After the first lock, tracking loss is a cue — not a return of the boot overlay.
  const isLoadingVisible =
    !poseState.hasPoseDetection || (!hasLockedPose && !poseState.poseDetected);
  // Only the loading overlay should be visible while the pose model boots —
  // hide the HUD so it never shows "00:00 · 0" as noise during warm-up.
  const isBooting = !poseState.hasPoseDetection;
  const qualityMessage =
    isMobile && detectionProgress?.qualityTier ? detectionProgress.message : null;
  // Raw poseDetected strobes at the publish rate under marginal framing; the
  // coaching phase machine and the live line key on this smoothed value so
  // the sentence doesn't rewrite itself every other frame.
  const trackingStable = useStableTracking(poseState.poseDetected);
  // The pain exit is studio-register chrome — the instrument's gentle stop.
  // An explicit Train session keeps the normal Stop control instead.
  const { register } = useSessionIntent();
  const studioSession = register !== 'arcade';
  const coachingMoment = useCoachingMoment(trackingStable, repCount, metrics?.warnings ?? []);
  // The meter face: raw detection + tracking stability → Clear/Usable/Early
  // needle with hysteresis (docs/PHASE_B_PLAN §B1). Coarse-but-honest feed —
  // the booleans are what the pipeline already publishes.
  const readPrevRef = React.useRef<ReadLevel | undefined>(undefined);
  const read = React.useMemo(() => {
    const q = readQuality(
      poseState.poseDetected ? 0.8 : 0.15,
      trackingStable ? 0.9 : 0.35,
      readPrevRef.current
    );
    readPrevRef.current = q.level;
    return q;
  }, [poseState.poseDetected, trackingStable]);

  const curlTelemetry =
    mode === 'curls' ? deriveCurlTelemetry(curlPoseData ?? undefined, metrics) : null;
  const twin = useCoachTwin({ session: true, mode });
  const heroActive = isTwinHeroActive(twin) && twin.enabled && !showFirstRepCelebration;
  const showSeeShow = !showFirstRepCelebration && (curlTelemetry?.elbowAngle != null || heroActive);

  const coachingStatusProps = {
    mode,
    tracking: trackingStable,
    repCount,
    warnings: metrics?.warnings,
    phase: coachingMoment.phase,
    warning: coachingMoment.warning,
    focusWarning: coachingMoment.focusWarning,
    retryFocus,
    firstSignal: showFirstRepCelebration,
    // The live line may only promise the arm when the arm (or its twin) can
    // actually demonstrate — otherwise it points at the on-screen instrument.
    armAvailable: twin.enabled && twin.status === 'connected',
  };

  if (isMobile) {
    // Mobile rep beat: no full-screen flash — the HUD pill count pulses and a
    // milestone chip appears for a beat. The coaching line and the instrument
    // stay legible through every rep (see session-bay.css bottom stack).
    return (
      <div className="w-full flex flex-col items-center justify-start relative h-full">
        {!isBooting && (
          <GameHUD
            mode={mode}
            timeLeft={timeLeft}
            repCount={repCount}
            formatTime={formatTime}
            isOverlay={isFullscreen}
            isRace={isRace}
            isMobile={isMobile}
            depth={metrics?.depth}
            warnings={metrics?.warnings}
            repPulse={repFeedback.show}
            read={read}
            readingTargetReps={readingTargetReps}
          />
        )}
        <div
          id="canvasContainerMobile"
          aria-label="Game Canvas Mobile"
          className={`w-full relative flex-grow rounded-xl overflow-hidden shadow-lg border border-white/10 session-camera-stage session-camera-stage--mobile ${isIOS ? 'session-camera-stage--ios' : ''} ${isFullscreen ? 'video-container-fs' : ''} ${hasLockedPose ? 'is-tracking' : ''}`}
          style={{ width: '100%' }}
        >
          {webcam}
          <GameLoadingOverlay
            phase={loadingPhase}
            progress={detectionProgress?.percentage}
            isVisible={isLoadingVisible}
          />
          {/* The framing ghost rides above the boot loader — the loader
              dims the feed while the model warms, so the guide must sit on
              top to stay legible. It fades on the first pose lock. */}
          {showFramingGhost && <FramingGhost leaving={hasLockedPose} mode={mode} />}
          {showJointInset && <LiveJointInset elevationDeg={reachElevationDeg} />}
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
          {showRotateHint && (
            <div className="session-rotate-hint">
              <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
              <span role="status">Rotate for full view</span>
              {onDismissRotateHint && (
                <button
                  type="button"
                  className="session-rotate-hint__dismiss"
                  onClick={onDismissRotateHint}
                  aria-label="Dismiss rotate hint"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          <SeeShowMoment
            twin={twin}
            userElbowDeg={curlTelemetry?.elbowAngle}
            yieldToFirstSignal={showFirstRepCelebration}
          />
          <ReadinessHint
            readiness={readiness}
            repCount={repCount}
            hasLockedPose={hasLockedPose}
            elevated
          />
          {/* Bottom band = one stack, no overlap: instrument above, the
              coaching sentence owns the bottom edge (closest to the eye).
              It waits for the pose model like the HUD does: while the boot
              overlay is centred on the stage there is nothing to coach yet,
              and the band would collide with the loader's step rail. */}
          {!isBooting && (
            <div className="session-bottom-stack">
              {/* The gentle pain exit docks right, above the coaching line —
                always reachable mid-set, never covering the sentence. */}
              {studioSession && onPainExit && (
                <button
                  type="button"
                  className="hud-pain-exit session-pain-exit"
                  onClick={onPainExit}
                >
                  It hurts — stop
                </button>
              )}
              {mode === 'curls' ? (
                <CurlFormInstrument
                  telemetry={curlTelemetry}
                  tracking={poseState.poseDetected}
                  repCount={repCount}
                  onFormScore={onFormScore}
                />
              ) : null}
              <LiveCoachingStatus {...coachingStatusProps} />
            </div>
          )}
        </div>
        <CoachTwinPeek session mode={mode} twin={twin} suppressed={showSeeShow} />
      </div>
    );
  }

  return (
    <div className="session-bay">
      {!isBooting && (
        <GameHUD
          mode={mode}
          timeLeft={timeLeft}
          repCount={repCount}
          formatTime={formatTime}
          isOverlay={false}
          isRace={isRace}
          depth={metrics?.depth}
          warnings={metrics?.warnings}
          read={read}
          onPainExit={onPainExit}
          readingTargetReps={readingTargetReps}
        />
      )}
      <div className="session-bay__stage">
        <aside className="session-bay__rail session-bay__rail--lead">
          {mode === 'curls' ? (
            <SeeShowMoment
              placement="rail"
              twin={twin}
              userElbowDeg={curlTelemetry?.elbowAngle}
              yieldToFirstSignal={showFirstRepCelebration}
            />
          ) : null}
          <LiveCoachingStatus {...coachingStatusProps} animate={false} />
        </aside>
        <div
          id="canvasContainerDesktop"
          aria-label="Game Canvas Desktop"
          className={`session-bay__camera relative overflow-hidden rounded-lg border border-white/10 session-camera-stage ${hasLockedPose ? 'is-tracking' : ''}`}
        >
          {webcam}
          <GameLoadingOverlay
            phase={loadingPhase}
            progress={detectionProgress?.percentage}
            isVisible={isLoadingVisible}
            isOverlay={true}
          />
          {showFramingGhost && <FramingGhost leaving={hasLockedPose} mode={mode} />}
          {showJointInset && <LiveJointInset elevationDeg={reachElevationDeg} />}
          <DebugOverlay started={true} poseDetected={poseState.poseDetected} />
          <RepFeedbackOverlay show={repFeedback.show} count={repFeedback.count} />
          <FirstRepCelebration show={showFirstRepCelebration} mode={mode} />
          <ReadinessHint readiness={readiness} repCount={repCount} hasLockedPose={hasLockedPose} />
        </div>
        <aside className="session-bay__rail session-bay__rail--trail">
          {mode === 'curls' ? (
            <CurlFormInstrument
              layout="rail"
              telemetry={curlTelemetry}
              tracking={poseState.poseDetected}
              repCount={repCount}
              onFormScore={onFormScore}
            />
          ) : null}
        </aside>
      </div>
      <CoachTwinPeek session mode={mode} twin={twin} suppressed={mode === 'curls' || showSeeShow} />
    </div>
  );
};

export default GameCanvas;
