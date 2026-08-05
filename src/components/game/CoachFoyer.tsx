'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Camera,
  LockKeyhole,
  ChevronDown,
  ChevronUp,
  Eye,
  Hand,
  Sparkles,
} from 'lucide-react';
import { BRAND, getIntentDef } from '@/lib/brandPositioning';
import { playStudioCue } from '@/lib/uiSound';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useImmersive } from '@/hooks/useImmersive';
import { coachStation, type StationStatus } from '@/services/coachStation';
import type { ExerciseMode } from '@/utils/biomechanics';
import '@/styles/coach-foyer.css';

type CoachFoyerProps = {
  mode: ExerciseMode;
  onModeChange: (mode: ExerciseMode) => void;
  onStart: () => void;
};

type ExerciseOption = {
  mode: ExerciseMode;
  label: string;
  detail: string;
  category: 'primary' | 'extra';
};

const howItWorks = [
  {
    icon: Eye,
    title: 'Camera reads form',
    body: 'Pose detection runs on your device — no video upload.',
  },
  {
    icon: Hand,
    title: 'Coach catches the issue',
    body: 'Live cues explain what to change while you move.',
  },
  {
    icon: Sparkles,
    title: 'Robot shows the fix',
    body: 'For upper-body corrections, the robot arm can demonstrate the movement in the bay when Coach is connected.',
  },
];

const exercises: ExerciseOption[] = [
  {
    mode: 'curls',
    label: 'Curls',
    detail: 'Camera catches elbow swing · Coach shows the correction',
    category: 'primary',
  },
  { mode: 'pushups', label: 'Push-ups', detail: 'Chest · elbows · line', category: 'primary' },
  { mode: 'squats', label: 'Squats', detail: 'Depth · knees · tempo', category: 'extra' },
  { mode: 'pullups', label: 'Pull-ups', detail: 'Extension · symmetry', category: 'extra' },
  { mode: 'jumps', label: 'Jumps', detail: 'Landing · knee track', category: 'extra' },
];

/** Warm the camera + pose chunk while the user reads the foyer so START is instant. */
function prefetchWebcamChunk() {
  void import('./Webcam').catch(() => {
    /* prefetch is best-effort; LazyWebcam loads on demand otherwise */
  });
}

function CoachSystemMap({
  status,
  enabled,
  className,
}: {
  status: StationStatus;
  enabled: boolean;
  className?: string;
}) {
  const coachLabel = 'Ready';
  const stationLabel = !enabled
    ? 'When connected'
    : status === 'connected'
      ? 'Connected'
      : status === 'connecting'
        ? 'Connecting'
        : 'Offline';

  return (
    <div
      className={`coach-foyer__system-map ${className || ''}`}
      role="img"
      aria-label={`Camera ready, form coach ready, robot arm ${stationLabel.toLowerCase()}`}
    >
      <div className="coach-foyer__system-node is-camera">
        <Camera size={16} strokeWidth={2} aria-hidden="true" />
        <span className="coach-foyer__system-node-name">Camera</span>
        <small>Ready</small>
      </div>
      <span className="coach-foyer__system-link" aria-hidden="true">
        →
      </span>
      <div className="coach-foyer__system-node is-coach">
        <Eye size={16} strokeWidth={2} aria-hidden="true" />
        <span className="coach-foyer__system-node-name">Form coach</span>
        <small>{coachLabel}</small>
      </div>
      <span className="coach-foyer__system-link" aria-hidden="true">
        →
      </span>
      <div className={`coach-foyer__system-node is-robot is-${status}`}>
        <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
        <span className="coach-foyer__system-node-name">SO-101</span>
        <small>{stationLabel}</small>
      </div>
    </div>
  );
}

export function CoachFoyer({ mode, onModeChange, onStart }: CoachFoyerProps) {
  const foyer = getIntentDef('understand').foyer;
  const { triggerHaptic } = useHapticFeedback();
  const { immersive, setImmersive } = useImmersive();
  const [coachStatus, setCoachStatus] = useState<StationStatus>(coachStation.status);
  const [showExtras, setShowExtras] = useState(false);
  // Explainer is collapsed by default — its content also rotates inside the
  // session-boot overlay, where the user is a captive audience.
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const firstExtraRef = React.useRef<HTMLButtonElement>(null);
  const moreToggleRef = React.useRef<HTMLButtonElement>(null);

  const primaryExercises = exercises.filter((e) => e.category === 'primary');
  const extraExercises = exercises.filter((e) => e.category === 'extra');

  useEffect(() => {
    if (!coachStation.enabled) return;
    const unsubscribe = coachStation.onStatus(setCoachStatus);
    coachStation.connect();
    return unsubscribe;
  }, []);

  // Prefetch the heavy camera chunk on idle + on CTA hover/press intent.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetchWebcamChunk, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(prefetchWebcamChunk, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Move focus to the first revealed exercise, or back to the toggle (a11y).
  React.useEffect(() => {
    if (showExtras && firstExtraRef.current) {
      firstExtraRef.current.focus();
    } else if (!showExtras && moreToggleRef.current) {
      moreToggleRef.current.focus();
    }
  }, [showExtras]);

  const renderExerciseButton = (exercise: ExerciseOption, index: number) => {
    const selected = exercise.mode === mode;
    return (
      <button
        key={exercise.mode}
        type="button"
        ref={exercise.category === 'extra' && index === 0 ? firstExtraRef : undefined}
        className={`coach-foyer__exercise${selected ? ' is-selected' : ''}`}
        style={{ animationDelay: `${180 + index * 40}ms` }}
        aria-pressed={selected}
        onClick={() => {
          playStudioCue('soft');
          triggerHaptic(40);
          onModeChange(exercise.mode);
        }}
      >
        <span className="coach-foyer__exercise-copy">
          <strong>{exercise.label}</strong>
          <small>{exercise.detail}</small>
        </span>
        <span className="coach-foyer__radio" aria-hidden="true" />
      </button>
    );
  };

  return (
    <section className="coach-foyer" aria-labelledby="coach-foyer-title">
      <div className="coach-foyer__atmosphere" aria-hidden="true">
        <div className="coach-foyer__glow" />
        <div className="coach-foyer__grid" />
        <div className="coach-foyer__orbit" />
      </div>

      <div className="coach-foyer__inner">
        <CoachSystemMap
          status={coachStatus}
          enabled={coachStation.enabled}
          className="motion-enter"
        />

        <p className="coach-foyer__brand motion-enter motion-delay-1">{foyer.brand}</p>

        <h2 id="coach-foyer-title" className="coach-foyer__title motion-enter motion-delay-2">
          {foyer.line1}
        </h2>
        <p className="coach-foyer__lede motion-enter motion-delay-2">{BRAND.visionLine}</p>

        <div
          className={`coach-foyer__coach-status is-${coachStation.enabled ? coachStatus : 'camera-only'} motion-enter`}
          style={{ animationDelay: '150ms' }}
          role="status"
          aria-live="polite"
        >
          <span className="coach-foyer__coach-status-dot" aria-hidden="true" />
          <span>
            {coachStation.enabled && coachStatus === 'connected'
              ? 'Camera coaching ready · Coach link connected'
              : coachStation.enabled && coachStatus === 'connecting'
                ? 'Camera coaching ready · Coach link connecting'
                : coachStation.enabled
                  ? 'Camera coaching ready · Coach link offline'
                  : 'Camera coaching ready · robot demo when Coach is connected'}
          </span>
        </div>

        {/* Two defaults, pre-answered — the only decision offered before START */}
        <fieldset className="coach-foyer__exercise-list motion-enter motion-delay-3">
          <legend>Choose a movement to coach</legend>
          {primaryExercises.map(renderExerciseButton)}
        </fieldset>

        <button
          type="button"
          id="startButton"
          className="coach-foyer__start coach-foyer__start--hero feel-press motion-enter"
          style={{ animationDelay: '320ms' }}
          aria-label={foyer.cta}
          onPointerEnter={prefetchWebcamChunk}
          onTouchStart={prefetchWebcamChunk}
          onClick={() => {
            playStudioCue('press');
            triggerHaptic([50, 100]);
            onStart();
          }}
        >
          <Camera size={18} strokeWidth={2} />
          {foyer.cta}
          <ArrowRight size={18} strokeWidth={2} />
        </button>

        <p
          className="coach-foyer__trust coach-foyer__trust--under-start motion-enter"
          style={{ animationDelay: '380ms' }}
        >
          <LockKeyhole size={14} strokeWidth={2} aria-hidden="true" />
          {BRAND.trustLine}
        </p>

        {/* Sandow lineage stamp — opt-in (immersive mode). Default experience
            is quiet; the heritage is discoverable via /lore, not relentless. */}
        {immersive && (
          <p className="sandow-lineage motion-enter" style={{ animationDelay: '420ms' }}>
            Graded vs. Sandow · 1897
          </p>
        )}

        <p className="coach-foyer__scope-note motion-enter" style={{ animationDelay: '400ms' }}>
          Curls are the clearest path to the robot demo when Coach is connected.
        </p>

        {/* Earned depth, demoted below the CTA */}
        <button
          type="button"
          ref={moreToggleRef}
          className="coach-foyer__more motion-enter"
          style={{ animationDelay: '420ms' }}
          aria-expanded={showExtras}
          aria-controls="coach-foyer-more-movements"
          onClick={() => {
            playStudioCue('soft');
            triggerHaptic(40);
            setShowExtras((prev) => !prev);
          }}
        >
          {showExtras ? (
            <>
              <ChevronUp size={14} /> Fewer movements
            </>
          ) : (
            <>
              <ChevronDown size={14} /> More movements
            </>
          )}
        </button>

        {showExtras && (
          <fieldset
            id="coach-foyer-more-movements"
            className="coach-foyer__exercise-list motion-enter"
          >
            <legend>More movements</legend>
            {extraExercises.map(renderExerciseButton)}
          </fieldset>
        )}

        <button
          type="button"
          className="coach-foyer__how-it-works-toggle motion-enter"
          style={{ animationDelay: '440ms' }}
          aria-expanded={showHowItWorks}
          onClick={() => {
            playStudioCue('soft');
            triggerHaptic(40);
            setShowHowItWorks((prev) => !prev);
          }}
        >
          {showHowItWorks ? 'Hide' : 'How it works'}
          {showHowItWorks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showHowItWorks && (
          <div className="coach-foyer__how-it-works motion-enter">
            {howItWorks.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="coach-foyer__how-it-works-item">
                  <Icon size={16} aria-hidden="true" />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                </div>
              );
            })}
            {/* Provenance link — quiet discovery, not a prize reference. */}
            <a
              href="/lore"
              className="coach-foyer__lore-link sandow-lineage"
              style={{ margin: '0.5rem 0 0', textDecoration: 'none' }}
            >
              The 1897 lineage →
            </a>

            {/* Immersive mode toggle — opt-in full Sandow storytelling.
                Default off; the verbose heritage is discoverable, not relentless. */}
            <label
              className="coach-foyer__immersive-toggle"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                margin: '0.75rem 0 0',
                cursor: 'pointer',
                fontSize: '0.72rem',
                color: 'var(--cf-soft, #7a9692)',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={immersive}
                onChange={(e) => {
                  playStudioCue('soft');
                  triggerHaptic(40);
                  setImmersive(e.target.checked);
                }}
                style={{ accentColor: 'var(--cf-teal, #56d9c3)' }}
                aria-label="Immersive heritage mode"
              />
              Immersive heritage
            </label>
          </div>
        )}
      </div>
    </section>
  );
}

export default CoachFoyer;
