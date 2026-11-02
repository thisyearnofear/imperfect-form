'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, ChevronDown, ChevronUp, Sparkles, Activity } from 'lucide-react';
import { getIntentDef } from '@/lib/brandPositioning';
import { playStudioCue } from '@/lib/uiSound';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { coachStation, type StationStatus } from '@/services/coachStation';
import type { ExerciseMode } from '@/utils/biomechanics';
import { LandingSections } from '@/components/home/LandingSections';
import { DemoPlate } from '@/components/home/DemoPlate';
import { PAIN_INTENTS, resolveRestoredPainIntentMode } from '@/lib/painIntents';
import { usePainIntent } from '@/hooks/usePainIntent';
import '@/styles/coach-foyer.css';

type CoachFoyerProps = {
  mode: ExerciseMode;
  onModeChange: (mode: ExerciseMode) => void;
  onStart: () => void;
  incomingChallenge?: boolean;
};

type ExerciseOption = {
  mode: ExerciseMode;
  label: string;
  detail: string;
  category: 'primary' | 'extra';
};

const exercises: ExerciseOption[] = [
  {
    mode: 'curls',
    label: 'Curls',
    detail: 'Elbow swing · arm demo',
    category: 'primary',
  },
  { mode: 'pushups', label: 'Push-ups', detail: 'Chest · elbows · line', category: 'primary' },
  {
    mode: 'squats',
    label: 'Squats',
    detail: 'Mobility · depth · knees',
    category: 'extra',
  },
  { mode: 'pullups', label: 'Pull-ups', detail: 'Extension · symmetry', category: 'extra' },
  { mode: 'jumps', label: 'Jumps', detail: 'Landing · knees', category: 'extra' },
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Warm the camera + pose chunk while the user reads the foyer so START is instant. */
function prefetchWebcamChunk() {
  void import('./Webcam').catch(() => {
    /* prefetch is best-effort; LazyWebcam loads on demand otherwise */
  });
}

export function CoachFoyer({
  mode,
  onModeChange,
  onStart,
  incomingChallenge = false,
}: CoachFoyerProps) {
  const foyer = getIntentDef('understand').foyer;
  const { triggerHaptic } = useHapticFeedback();
  const [coachStatus, setCoachStatus] = useState<StationStatus>(coachStation.status);
  const [showExtras, setShowExtras] = useState(false);
  const [ctaOutOfView, setCtaOutOfView] = useState(false);
  const { painIntent, setPainIntent, hydrated } = usePainIntent();
  const extrasTouchedRef = useRef(false);
  const firstExtraRef = useRef<HTMLButtonElement>(null);
  const moreToggleRef = useRef<HTMLButtonElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  const primaryExercises = exercises.filter((e) => e.category === 'primary');
  const extraExercises = exercises.filter((e) => e.category === 'extra');
  const selectedExercise = exercises.find((exercise) => exercise.mode === mode) ?? exercises[0];

  // When an extra movement is picked while the extras list is closed (e.g. by a
  // pain chip), promote it into the visible pair instead of expanding the full
  // list — expanding all three extras pushes the CTA below the fold on short
  // viewports. Once the user opens "More movements", primaries go back to the
  // top slot and the selected extra shows selected inside the extras list.
  const pickedExtra = !showExtras ? extraExercises.find((e) => e.mode === mode) : undefined;
  const visibleExercises = pickedExtra
    ? [pickedExtra, ...primaryExercises].slice(0, 2)
    : primaryExercises;

  // Station-aware robot-demo chip on the flagship Curls card: live when the
  // Coach link is up, dormant when it isn't — the robot demo is signposted at
  // the point of choice, not in a footnote below the CTA.
  const robotChipState =
    !coachStation.enabled || coachStatus === 'offline'
      ? 'dormant'
      : coachStatus === 'connected'
        ? 'live'
        : 'connecting';

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
  // Skip the initial mount so "More movements" never steals first focus.
  useEffect(() => {
    if (!extrasTouchedRef.current) return;
    if (showExtras && firstExtraRef.current) {
      firstExtraRef.current.focus();
    } else if (!showExtras && moreToggleRef.current) {
      moreToggleRef.current.focus();
    }
  }, [showExtras]);

  // A chip restored from storage arrives after mount (usePainIntent hydrates in
  // an effect), so apply its move once and bring it into view. Without this the
  // subhead, plate and "Sound familiar" content follow the chip while the move
  // stays at the default. An incoming challenge keeps its own movement.
  const restoredChipAppliedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || restoredChipAppliedRef.current) return;
    restoredChipAppliedRef.current = true;
    if (!painIntent) return;
    const restoredMode = resolveRestoredPainIntentMode(
      painIntent,
      mode,
      Boolean(incomingChallenge)
    );
    if (restoredMode) onModeChange(restoredMode);
    const prefersReduced = prefersReducedMotion();
    requestAnimationFrame(() => {
      document.querySelector('.coach-foyer__pain-chip.is-selected')?.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    });
    // Applied once per mount, when hydration completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Sticky mini CTA: fades in once BOTH the hero button and the final CTA are
  // scrolled out of view. Mobile only via CSS (<768px).
  useEffect(() => {
    const start = startButtonRef.current;
    const finale = document.querySelector('.ls-final .coach-foyer__start');
    if (!start || !finale) return;
    const inView = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    };
    let startVisible = inView(start);
    let finalVisible = inView(finale);
    const update = () => setCtaOutOfView(!startVisible && !finalVisible);
    update();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === start) startVisible = entry.isIntersecting;
          else finalVisible = entry.isIntersecting;
        }
        update();
      },
      { threshold: 0 }
    );
    io.observe(start);
    io.observe(finale);
    return () => io.disconnect();
  }, []);

  const handleStart = () => {
    playStudioCue('press');
    triggerHaptic([50, 100]);
    onStart();
  };

  const renderExerciseButton = (exercise: ExerciseOption, index: number) => {
    const selected = exercise.mode === mode;
    return (
      <button
        key={exercise.mode}
        type="button"
        ref={exercise.category === 'extra' && index === 0 ? firstExtraRef : undefined}
        className={`coach-foyer__exercise${selected ? ' is-selected' : ''}`}
        aria-pressed={selected}
        onClick={() => {
          playStudioCue('soft');
          triggerHaptic(40);
          onModeChange(exercise.mode);
        }}
      >
        <span className="coach-foyer__exercise-copy">
          <span className="coach-foyer__exercise-title">
            <strong>{exercise.label}</strong>
            {exercise.mode === 'curls' ? (
              <span className={`coach-foyer__robot-chip is-${robotChipState}`}>
                <Sparkles size={10} strokeWidth={2} aria-hidden="true" />
                Robot demo
              </span>
            ) : exercise.mode === 'squats' ? (
              <span className="coach-foyer__robot-chip is-mobility">
                <Activity size={10} strokeWidth={2} aria-hidden="true" />
                Mobility check
              </span>
            ) : null}
          </span>
          <small>{exercise.detail}</small>
        </span>
        <span className="coach-foyer__radio" aria-hidden="true" />
      </button>
    );
  };

  return (
    <section
      className={`coach-foyer coach-foyer--${mode}`}
      aria-labelledby="coach-foyer-title"
      data-coach-mode={mode}
    >
      <a className="coach-foyer__skip" href="#startButton">
        Skip to start
      </a>

      <div className="coach-foyer__atmosphere" aria-hidden="true">
        <div className="coach-foyer__glow" />
      </div>

      <div className="coach-foyer__inner">
        <div className="coach-foyer__hero">
          <div className="coach-foyer__hero-copy">
            <p className="coach-foyer__brand lf-rise" style={{ animationDelay: '0ms' }}>
              <span className="coach-foyer__brand-rule" aria-hidden="true" />
              {foyer.brand}
            </p>

            {/* Serif display, words staggered; "better." is the italic brass beat. */}
            <h2 id="coach-foyer-title" className="coach-foyer__title">
              <span className="coach-foyer__title-word lf-rise" style={{ animationDelay: '70ms' }}>
                Make
              </span>{' '}
              <span className="coach-foyer__title-word lf-rise" style={{ animationDelay: '120ms' }}>
                one
              </span>{' '}
              <span className="coach-foyer__title-word lf-rise" style={{ animationDelay: '170ms' }}>
                rep
              </span>{' '}
              <em
                className="coach-foyer__title-word coach-foyer__title-brass lf-rise"
                style={{ animationDelay: '220ms' }}
              >
                better.
              </em>
            </h2>
            <p
              key={painIntent?.id ?? 'default'}
              className="coach-foyer__lede lf-swap"
              style={{ animationDelay: '280ms' }}
            >
              {painIntent?.subhead ?? foyer.line2}
            </p>

            {/* Pain-intent chips — picking one adapts the subhead, the move
                cards and the "Sound familiar" section. None selected = the
                default page. */}
            <div
              className="coach-foyer__pain lf-rise"
              style={{ animationDelay: '320ms' }}
              role="group"
              aria-label="What brings you here?"
            >
              <span className="coach-foyer__pain-label">What brings you here?</span>
              <div className="coach-foyer__pain-chips">
                {PAIN_INTENTS.map((chip) => {
                  const selected = painIntent?.id === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={`coach-foyer__pain-chip${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={(e) => {
                        playStudioCue('soft');
                        triggerHaptic(30);
                        const next = selected ? null : chip.id;
                        setPainIntent(next);
                        if (next) {
                          onModeChange(chip.mode);
                          // Keep the active chip visible in the scroll row.
                          e.currentTarget.scrollIntoView({
                            inline: 'center',
                            block: 'nearest',
                            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                          });
                        }
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {incomingChallenge && (
              <div className="coach-foyer__incoming-challenge" role="status" aria-live="polite">
                <div className="coach-foyer__incoming-challenge-mark" aria-hidden="true">
                  <Sparkles size={16} strokeWidth={2} />
                </div>
                <div>
                  <strong>A movement line was sent to you</strong>
                  <span>Meet the ghost, try the same movement, and find your own correction.</span>
                </div>
              </div>
            )}

            {/* Two defaults, pre-answered — the only decision offered before START */}
            <fieldset
              className="coach-foyer__exercise-list lf-rise"
              style={{ animationDelay: '210ms' }}
            >
              <legend className="sr-only">Pick a movement</legend>
              {visibleExercises.map(renderExerciseButton)}
            </fieldset>

            <button
              type="button"
              ref={moreToggleRef}
              className="coach-foyer__more lf-rise"
              style={{ animationDelay: '240ms' }}
              aria-expanded={showExtras}
              aria-controls="coach-foyer-more-movements"
              onClick={() => {
                extrasTouchedRef.current = true;
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
                className="coach-foyer__exercise-list coach-foyer__exercise-list--extras"
              >
                <legend>More movements</legend>
                {extraExercises.map(renderExerciseButton)}
              </fieldset>
            )}

            <button
              type="button"
              id="startButton"
              ref={startButtonRef}
              className="coach-foyer__start coach-foyer__start--hero feel-press lf-rise"
              style={{ animationDelay: '340ms' }}
              aria-label={`Try one rep of ${selectedExercise.label} with camera coaching`}
              onPointerEnter={prefetchWebcamChunk}
              onTouchStart={prefetchWebcamChunk}
              onClick={handleStart}
            >
              <Camera size={18} strokeWidth={2} aria-hidden="true" />
              <span>{incomingChallenge ? 'Meet the ghost' : 'Try one rep'}</span>
              <ArrowRight
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className="coach-foyer__start-arrow"
              />
            </button>

            {coachStation.enabled && coachStatus === 'connected' && (
              <p className="coach-foyer__coach-chip lf-rise" role="status">
                <span className="coach-foyer__coach-chip-dot" aria-hidden="true" />
                Coach arm connected
              </p>
            )}

            <p className="coach-foyer__assist lf-rise" style={{ animationDelay: '400ms' }}>
              Pose detection runs on your device. No video upload.
            </p>
            <p className="coach-foyer__assist lf-rise" style={{ animationDelay: '400ms' }}>
              Stand 1.5 to 2.5 m back so your head and hips are in frame.
            </p>

            {/* Plate I peeks under the CTA on narrow layouts; the --aside
                plate owns the right column on wide ones. */}
            <div
              className="coach-foyer__arm coach-foyer__arm--inline lf-rise"
              style={{ animationDelay: '440ms' }}
            >
              <DemoPlate
                mode={mode}
                selectedExerciseLabel={selectedExercise.label}
                callout={painIntent?.plateCallout}
              />
            </div>
          </div>

          <div
            className="coach-foyer__arm coach-foyer__arm--aside lf-rise"
            style={{ animationDelay: '200ms' }}
          >
            <DemoPlate
              mode={mode}
              selectedExerciseLabel={selectedExercise.label}
              callout={painIntent?.plateCallout}
            />
          </div>
        </div>

        <LandingSections
          mode={mode}
          selectedExerciseLabel={selectedExercise.label}
          onStart={handleStart}
          painIntent={painIntent}
        />
      </div>

      {/* Sticky mini CTA — mobile only, once every start button is offscreen. */}
      <div
        className={`coach-foyer__mini-cta${ctaOutOfView ? ' is-visible' : ''}`}
        data-visible={ctaOutOfView}
      >
        <button
          type="button"
          className="coach-foyer__start"
          aria-label={`Try one rep of ${selectedExercise.label} with camera coaching`}
          onClick={handleStart}
        >
          <Camera size={16} strokeWidth={2} aria-hidden="true" />
          <span>Try one rep</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default CoachFoyer;
