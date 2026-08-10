import React from 'react';
import ModeSwitch from './ModeSwitch';
import { AgentInsightTray } from './AgentInsightTray';
import { BiomechanicalState } from '@/types/mediapipe';
import { getIntentDef } from '@/lib/brandPositioning';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import { playUiCue } from '@/lib/uiSound';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import {
  loadPreprocessorSettings,
  savePreprocessorSettings,
  PosePreprocessorSettings,
  getCpuFilterMaxPixels,
  PHASE2_CV_FILTERS_ENABLED,
} from '@/lib/pose/posePreprocessor';
import { getDeviceInfo } from '@/utils/deviceDetection';

interface GameControlsProps {
  started: boolean;
  isMobile: boolean;
  /** Whether the device is in landscape orientation (mobile landscape UX) */
  isLandscape?: boolean;
  metrics: BiomechanicalState | null;
  mode: import('@/utils/biomechanics').ExerciseMode;
  voiceEnabled: boolean;
  repCount: number;
  userId?: string;
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
  isLandscape = false,
  metrics,
  mode,
  voiceEnabled,
  repCount,
  userId,
  calmSessionActive = false,
  onStop,
  onStart,
  onReset,
  onModeChange,
}) => {
  const { intent } = useSessionIntent();
  const { controls, register } = getIntentDef(intent);
  const busy = started || calmSessionActive;

  const [preprocessor, setPreprocessor] = React.useState<PosePreprocessorSettings>(() => {
    const settings = loadPreprocessorSettings();
    if (typeof window !== 'undefined') {
      settings.cpuFilterMaxPixels = getCpuFilterMaxPixels(getDeviceInfo().performanceLevel);
    }
    return settings;
  });

  const updatePreprocessor = (updates: Partial<PosePreprocessorSettings>) => {
    const next: PosePreprocessorSettings = { ...preprocessor, ...updates };
    // Keep the legacy 'mode' field in sync for backward compatibility.
    if ('enabled' in updates || 'autoExposure' in updates) {
      next.mode = next.enabled && next.autoExposure ? 'auto' : 'none';
    }
    setPreprocessor(next);
    savePreprocessorSettings(next);
  };

  const activeFeatureCount = [
    preprocessor.autoExposure,
    ...(PHASE2_CV_FILTERS_ENABLED
      ? [preprocessor.cameraCalibration, preprocessor.generativeCleanup]
      : []),
  ].filter(Boolean).length;

  const handleStart = () => {
    playUiCue('press', { register });
    onStart();
  };

  const isMobileLandscape = isMobile && isLandscape;

  return (
    <div
      id="controls"
      className={`${isMobile ? 'mobile-controls' : 'mt-4'} controls-container${
        isMobileLandscape ? ' controls-container--landscape' : ''
      }`}
      style={{ marginBottom: isMobile ? '8px' : '0' }}
      data-register={register}
    >
      {started ? (
        <div
          className={`controls-enter w-full flex gap-3 items-center${isMobileLandscape ? ' controls-row--landscape' : ''}`}
        >
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
            className={`touch-manipulation font-bold touch-target stop-button-discrete ${
              isMobile
                ? 'py-4 px-6 text-base min-h-[56px] min-w-[80px] rounded-xl shadow-lg'
                : 'py-3 px-5 text-sm'
            }`}
            aria-label="Stop game"
            onClick={onStop}
          >
            End session
          </button>
        </div>
      ) : (
        <div
          className={`flex justify-between w-full h-full items-center controls-enter gap-2${isMobileLandscape ? ' controls-row--landscape' : ''}`}
        >
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
              className="py-3 px-4 text-sm sm:text-base touch-manipulation font-bold mobile-controls-button touch-target feel-press"
              style={{ minHeight: isMobile ? '50px' : 'auto' }}
              aria-label={controls.primaryAria}
              onClick={handleStart}
              disabled={busy}
              title={busy ? 'Already in session' : controls.primaryAria}
            >
              {controls.primary}
            </button>
            <button
              id="resetButton"
              className="py-3 px-4 text-sm sm:text-base touch-manipulation font-bold mobile-controls-button touch-target feel-press"
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
      {/* Engineering-only: CV preprocessing toggles stay out of the consumer
          UI. They remain reachable in dev builds for tuning; production users
          see a clean coaching surface. */}
      {process.env.NODE_ENV === 'development' && !started && (
        <div className="pt-3 border-t border-white/10 mt-3 w-full flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <ToggleSwitch
              checked={preprocessor.enabled}
              onChange={(enabled) => updatePreprocessor({ enabled })}
              label="Enable CV preprocessing"
            />
            {preprocessor.enabled && (
              <span className="text-xs text-teal-200/80">({activeFeatureCount} active)</span>
            )}
          </div>
          {preprocessor.enabled && (
            <div className="pl-4 border-l border-white/10 ml-2 flex flex-col gap-2">
              <ToggleSwitch
                checked={preprocessor.autoExposure}
                onChange={(autoExposure) => updatePreprocessor({ autoExposure })}
                label="Auto-exposure / white balance (classical)"
              />
              {PHASE2_CV_FILTERS_ENABLED && (
                <>
                  <ToggleSwitch
                    checked={preprocessor.cameraCalibration}
                    onChange={(cameraCalibration) => updatePreprocessor({ cameraCalibration })}
                    label="Lens distortion fix (classical)"
                  />
                  <ToggleSwitch
                    checked={preprocessor.generativeCleanup}
                    onChange={(generativeCleanup) => updatePreprocessor({ generativeCleanup })}
                    label="Generative low-light cleanup (spike)"
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
