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

const CameraPrimer: React.FC<CameraPrimerProps> = ({ mode, onEnable, onCancel }) => {
  const guidance = guidanceFor(mode);

  return (
    <div className="camera-primer motion-enter">
      <div className="camera-primer__icon">
        <Camera size={23} />
      </div>
      <div className="camera-primer__heading">
        <p>Before we start</p>
        <h3>Set up for {guidance.label}</h3>
      </div>
      <ul className="camera-primer__steps">
        <li>
          <MonitorUp size={17} />
          <span>{guidance.camera}</span>
        </li>
        <li>
          <ShieldCheck size={17} />
          <span>{guidance.setup}</span>
        </li>
        <li>
          <LockKeyhole size={17} />
          <span>Video stays on your device. Nothing is recorded or uploaded.</span>
        </li>
      </ul>
      <p className="camera-primer__focus">{guidance.focus}</p>
      <div className="camera-primer__actions">
        <button onClick={onEnable}>Enable camera</button>
        <button onClick={onCancel}>Not now</button>
      </div>
    </div>
  );
};

export default CameraPrimer;

const PRIMER_SEEN_KEY = 'cameraPrimerSeen';

export function shouldShowCameraPrimer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PRIMER_SEEN_KEY) !== 'true';
}

export function markCameraPrimerSeen(): void {
  window.localStorage.setItem(PRIMER_SEEN_KEY, 'true');
}
