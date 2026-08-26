'use client';

import React, { useEffect, useRef } from 'react';
import { Camera, LockKeyhole, MonitorUp, ShieldCheck } from 'lucide-react';
import { guidanceFor } from '@/lib/exerciseGuidance';
import type { ExerciseMode } from '@/utils/biomechanics';
import '@/styles/camera-primer.css';

interface CameraPrimerProps {
  mode: ExerciseMode;
  /** iOS Safari has a different permission recovery path than desktop browsers. */
  isIOS?: boolean;
  onEnable: () => void;
  onCancel: () => void;
}

/**
 * Camera recovery card. The first-run flow asks the browser for camera access
 * directly from the START press (the OS prompt IS the consent UX), so this
 * surface exists only for one job: when permission was denied, explain the
 * fix and offer a retry — it is no longer a gate on a healthy first run.
 */
const CameraPrimer: React.FC<CameraPrimerProps> = ({ mode, isIOS = false, onEnable, onCancel }) => {
  const guidance = guidanceFor(mode);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const permissionRecovery = isIOS
    ? 'In Safari, open the page menu (aA) → Website Settings → Camera → Allow, then return and try again.'
    : "Allow camera access via the icon in your browser's address bar, then try again.";

  useEffect(() => {
    retryButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [retryButtonRef.current, cancelButtonRef.current].filter(
        (element): element is HTMLButtonElement => element !== null && !element.disabled
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="camera-primer motion-enter" data-testid="recovery-card">
      <div className="camera-primer__icon">
        <Camera size={23} />
      </div>
      <div className="camera-primer__heading">
        <p>Camera is off</p>
        <h3 id="camera-primer-title">
          Present your form — the camera grades your {guidance.label.toLowerCase()}
        </h3>
      </div>
      <ul id="camera-primer-description" className="camera-primer__steps">
        <li>
          <MonitorUp size={17} />
          <span>{guidance.camera}</span>
        </li>
        <li>
          <ShieldCheck size={17} />
          <span>{permissionRecovery}</span>
        </li>
        <li>
          <LockKeyhole size={17} />
          <span>Video stays on your device. Nothing is recorded or uploaded.</span>
        </li>
      </ul>
      {/* Edge-state coach voice: permission is the only gate, and it is not a
          rush — the coach stays patient until the camera is allowed. */}
      <p className="camera-primer__focus">
        <strong>{isIOS ? 'Safari setup' : 'Camera setup'}</strong>
        <span>The coach is patient. {guidance.focus}</span>
      </p>
      <div className="camera-primer__actions">
        <button type="button" ref={retryButtonRef} onClick={onEnable}>
          Try again
        </button>
        <button type="button" ref={cancelButtonRef} onClick={onCancel}>
          Not now
        </button>
      </div>
    </div>
  );
};

export default CameraPrimer;

const PRIMER_SEEN_KEY = 'cameraPrimerSeen';

/**
 * True until the user has granted camera access once. The grant — not a
 * primer view — is what ends the first-use state.
 */
export function isFirstCameraUse(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PRIMER_SEEN_KEY) !== 'true';
}

export function markCameraIntroHandled(): void {
  window.localStorage.setItem(PRIMER_SEEN_KEY, 'true');
}

/**
 * Ask the browser for camera access directly (fires the OS permission prompt
 * from the pressing gesture). Releases the probe stream immediately — the
 * workout pipeline opens its own — so this is purely a warm, prompt-first
 * permission ask with an instant denial signal back to the UI.
 */
export async function requestCameraAccess(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== 'function'
  ) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}
