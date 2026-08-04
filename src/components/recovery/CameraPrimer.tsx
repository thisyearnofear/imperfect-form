'use client';

import React from 'react';
import { Camera, LockKeyhole, MonitorUp, ShieldCheck } from 'lucide-react';
import { guidanceFor } from '@/lib/exerciseGuidance';
import type { ExerciseMode } from '@/utils/biomechanics';
import '@/styles/camera-primer.css';

interface CameraPrimerProps {
  mode: ExerciseMode;
  onEnable: () => void;
  onCancel: () => void;
}

/**
 * Camera recovery card. The first-run flow asks the browser for camera access
 * directly from the START press (the OS prompt IS the consent UX), so this
 * surface exists only for one job: when permission was denied, explain the
 * fix and offer a retry — it is no longer a gate on a healthy first run.
 */
const CameraPrimer: React.FC<CameraPrimerProps> = ({ mode, onEnable, onCancel }) => {
  const guidance = guidanceFor(mode);

  return (
    <div className="camera-primer motion-enter">
      <div className="camera-primer__icon">
        <Camera size={23} />
      </div>
      <div className="camera-primer__heading">
        <p>Camera is off</p>
        <h3>Present your form — the camera grades your {guidance.label.toLowerCase()}</h3>
      </div>
      <ul className="camera-primer__steps">
        <li>
          <MonitorUp size={17} />
          <span>{guidance.camera}</span>
        </li>
        <li>
          <ShieldCheck size={17} />
          <span>
            Allow camera access via the icon in your browser&apos;s address bar, then try again.
          </span>
        </li>
        <li>
          <LockKeyhole size={17} />
          <span>Video stays on your device. Nothing is recorded or uploaded.</span>
        </li>
      </ul>
      <p className="camera-primer__focus">{guidance.focus}</p>
      <div className="camera-primer__actions">
        <button onClick={onEnable}>Try again</button>
        <button onClick={onCancel}>Not now</button>
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
