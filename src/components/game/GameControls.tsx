import React from 'react';
import ModeSwitch from './ModeSwitch';
import { AgentInsightTray } from './AgentInsightTray';
import { BiomechanicalState } from '@/types/mediapipe';
import { getIntentDef } from '@/lib/brandPositioning';
import { useSessionIntent } from '@/hooks/useSessionIntent';

interface GameControlsProps {
  started: boolean;
  isMobile: boolean;
  metrics: BiomechanicalState | null;
  mode: import('@/utils/biomechanics').ExerciseMode;
  voiceEnabled: boolean;
  repCount: number;
  userId?: string;
  finalAddress?: string;
  /** Calm / Breathe session active inside #screen (not a camera workout) */
  calmSessionActive?: boolean;
  onStop: () => void;
  onStart: () => void;
  onReset: () => void;
  onModeChange: (mode: import('@/utils/biomechanics').ExerciseMode) => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  started,
  isMobile,
  metrics,
  mode,
  voiceEnabled,
  repCount,
  userId,
  finalAddress,
  calmSessionActive = false,
  onStop,
  onStart,
  onReset,
  onModeChange,
}) => {
  const { intent } = useSessionIntent();
  const { controls, register } = getIntentDef(intent);
  const busy = started || calmSessionActive;

  return (
    <div
      id="controls"
      className={`${isMobile ? 'mobile-controls' : 'mt-4'} controls-container`}
      style={{ marginBottom: isMobile ? '8px' : '0' }}
      data-register={register}
    >
      {started ? (
        <div className="controls-enter w-full flex gap-3 items-center">
          <div className={`min-w-0 ${isMobile ? 'coachy-wrap' : 'flex-1'}`}>
            <AgentInsightTray
              metrics={metrics}
              mode={mode}
              voiceEnabled={voiceEnabled}
              repCount={repCount}
              userId={userId}
            />
          </div>
          <button
            id="stopButton"
            className={`touch-manipulation font-bold touch-target stop-button-discrete transition-all duration-200 hover:scale-105 active:scale-95 ${
              isMobile
                ? 'py-4 px-6 text-base min-h-[56px] min-w-[80px] rounded-xl shadow-lg'
                : 'py-3 px-5 text-sm'
            }`}
            style={
              isMobile
                ? {
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  }
                : {}
            }
            aria-label="Stop game"
            onClick={onStop}
          >
            {isMobile ? '■' : 'STOP'}
          </button>
        </div>
      ) : (
        <div className="flex justify-between w-full h-full items-center controls-enter gap-2">
          {controls.showExerciseModes ? (
            <ModeSwitch
              value={mode}
              disabled={busy}
              onChange={onModeChange}
              className={isMobile ? 'mobile-mode-switch' : ''}
              ariaLabel={controls.modeGroupLabel}
            />
          ) : (
            <p className="calm-session-hint">
              {calmSessionActive ? 'Session in progress' : 'No camera · just breath'}
            </p>
          )}
          <div className="flex gap-2">
            <button
              id="startButton"
              className="py-3 px-4 text-sm sm:text-base touch-manipulation font-bold mobile-controls-button touch-target"
              style={{ minHeight: isMobile ? '50px' : 'auto' }}
              aria-label={controls.primaryAria}
              onClick={onStart}
              disabled={busy}
              title={busy ? 'Already in session' : controls.primaryAria}
            >
              {controls.primary}
            </button>
            <button
              id="resetButton"
              className="py-3 px-4 text-sm sm:text-base touch-manipulation font-bold mobile-controls-button touch-target"
              style={{ minHeight: isMobile ? '50px' : 'auto' }}
              aria-label={controls.secondaryAria}
              onClick={onReset}
              disabled={started}
            >
              {controls.secondary}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
