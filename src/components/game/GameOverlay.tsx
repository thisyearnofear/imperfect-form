import React, { useEffect, useRef, useState } from 'react';
import { UnifiedLoader } from '@/components/ui';
import type { LoadingPhase } from '@/components/ui/UnifiedLoader';

interface GameOverlayProps {
  phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
  progress?: number;
  isVisible: boolean;
  isOverlay?: boolean;
}

const PHASE_ORDER: LoadingPhase[] = ['initial', 'camera', 'ai', 'positioning', 'ready'];
/** No phase renders for less than this — sub-second states read as flicker bugs. */
const PHASE_MIN_MS = 700;
/** When the pose model was pre-warmed on idle (window.__imfPreWarmedDetector),
 *  the 'ai' phase is not a real wait — collapse it to a brief beat so returning
 *  users don't sit on a fake 700ms loader. */
const AI_PHASE_WARM_MS = 220;
/** 'Ready' is a deliberate beat, not a frame-flash while the overlay hides. */
const READY_BEAT_MS = 900;

const phaseRank = (p: LoadingPhase) => PHASE_ORDER.indexOf(p);

/** True when ClientOnlyProviders pre-warmed MoveNet on idle. */
function isModelPreWarmed(): boolean {
  return typeof window !== 'undefined' && !!window.__imfPreWarmedDetector;
}

export const GameLoadingOverlay: React.FC<GameOverlayProps> = ({
  phase,
  progress,
  isVisible,
  isOverlay = true,
}) => {
  const [heldPhase, setHeldPhase] = useState<LoadingPhase>(phase);
  const [readyBeat, setReadyBeat] = useState(false);
  const lastAdvanceRef = useRef<number>(Date.now());
  const latestPhaseRef = useRef<LoadingPhase>(phase);
  const wasVisibleRef = useRef<boolean>(isVisible);

  // One continuous overlay: phases only move forward, each held for a minimum
  // beat. If reality skips ahead (warm model, granted camera), we jump straight
  // to the newest phase instead of replaying micro-states.
  useEffect(() => {
    latestPhaseRef.current = phase;

    // New boot sequence (e.g. second session): reset to whatever phase we open at.
    if (isVisible && !wasVisibleRef.current) {
      lastAdvanceRef.current = Date.now();
      setHeldPhase(phase);
      setReadyBeat(false);
    }
    wasVisibleRef.current = isVisible;

    if (phase === heldPhase) return;
    if (phaseRank(phase) < phaseRank(heldPhase)) return; // never regress

    const elapsed = Date.now() - lastAdvanceRef.current;
    // Pre-warmed model: the 'ai' phase is not a real load — shorten its hold
    // so returning users skip the fake 700ms wait. Other phases keep PHASE_MIN_MS.
    const minMs = phase === 'ai' && isModelPreWarmed() ? AI_PHASE_WARM_MS : PHASE_MIN_MS;
    const wait = Math.max(0, minMs - elapsed);
    const timer = setTimeout(() => {
      const newest = latestPhaseRef.current;
      if (phaseRank(newest) < phaseRank(heldPhase)) return;
      lastAdvanceRef.current = Date.now();
      setHeldPhase(newest);
    }, wait);
    return () => clearTimeout(timer);
  }, [phase, heldPhase, isVisible]);

  // When the real state says "done", show a short READY beat before hiding
  // instead of clipping the moment pose detection locks in.
  useEffect(() => {
    if (isVisible) return;
    setReadyBeat(true);
    const timer = setTimeout(() => setReadyBeat(false), READY_BEAT_MS);
    return () => clearTimeout(timer);
  }, [isVisible]);

  const overlayVisible = isVisible || readyBeat;
  const effectivePhase: LoadingPhase = !isVisible && readyBeat ? 'ready' : heldPhase;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isOverlay ? 'z-[90]' : 'z-20'}`}
    >
      <UnifiedLoader
        phase={effectivePhase}
        progress={progress}
        isVisible={overlayVisible}
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
