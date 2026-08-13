'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  LockKeyhole,
  ChevronDown,
  ChevronUp,
  Eye,
  Hand,
  Sparkles,
  Activity,
} from 'lucide-react';
import { BRAND, getIntentDef } from '@/lib/brandPositioning';
import { playStudioCue } from '@/lib/uiSound';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useImmersive } from '@/hooks/useImmersive';
import { coachStation, type StationStatus } from '@/services/coachStation';
import type { ExerciseMode } from '@/utils/biomechanics';
import { cleanupCameraStream, requestCameraPermission } from '@/utils/cameraPermissions';
import { MovementPreview } from '@/components/game/MovementPreview';
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
  {
    mode: 'squats',
    label: 'Squats',
    detail: 'Mobility · depth · knee tracking',
    category: 'extra',
  },
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
      aria-label={`Camera waiting for you, form coach ready, robot arm ${stationLabel.toLowerCase()}`}
    >
      <div className="coach-foyer__system-node is-camera">
        <Camera size={16} strokeWidth={2} aria-hidden="true" />
        <span className="coach-foyer__system-node-name">Camera</span>
        <small>Waiting for you</small>
      </div>
      <span className="coach-foyer__system-link" aria-hidden="true">
        →
      </span>
      <div className="coach-foyer__system-node is-coach">
        <Eye size={16} strokeWidth={2} aria-hidden="true" />
        <span className="coach-foyer__system-node-name">Coach</span>
        <small>{coachLabel}</small>
      </div>
      <span className="coach-foyer__system-link" aria-hidden="true">
        →
      </span>
      <div className={`coach-foyer__system-node is-robot is-${status}`}>
        <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
        <span className="coach-foyer__system-node-name">SO-101 Coach</span>
        <small>{stationLabel}</small>
      </div>
    </div>
  );
}

function FramingDiagram({ mode }: { mode: ExerciseMode }) {
  const upperBody = mode === 'curls';
  return (
    <div
      className={`coach-foyer__frame-visual${upperBody ? ' is-upper-body' : ' is-full-body'}`}
      aria-hidden="true"
    >
      <div className="coach-foyer__frame-visual-label">
        <Camera size={11} strokeWidth={2} />
        Ideal camera view
      </div>
      <svg viewBox="0 0 180 128" focusable="false">
        <rect
          className="coach-foyer__frame-outline"
          x="13"
          y="13"
          width="154"
          height="102"
          rx="8"
        />
        <path
          className="coach-foyer__frame-corner"
          d="M25 37V25h12M143 25h12v12M25 91v12h12M143 103h12V91"
        />
        <circle className="coach-foyer__frame-head" cx="90" cy="42" r="11" />
        <path
          className="coach-foyer__frame-body"
          d={upperBody ? 'M90 54v34M68 67h44' : 'M90 54v34M68 67h44M90 88l-18 25M90 88l18 25'}
        />
        <path
          className="coach-foyer__frame-arms"
          d={upperBody ? 'M68 67L48 78M112 67l20 11' : 'M68 67L53 81M112 67l15 14'}
        />
        <circle className="coach-foyer__frame-landmark" cx="68" cy="67" r="2.5" />
        <circle className="coach-foyer__frame-landmark" cx="112" cy="67" r="2.5" />
        {!upperBody && (
          <>
            <circle className="coach-foyer__frame-landmark" cx="72" cy="113" r="2.5" />
            <circle className="coach-foyer__frame-landmark" cx="108" cy="113" r="2.5" />
          </>
        )}
      </svg>
      <span className="coach-foyer__frame-visual-caption">
        {upperBody ? 'Head · shoulders · hips · arms' : 'Head · shoulders · hips · feet'}
      </span>
    </div>
  );
}

export function CoachFoyer({
  mode,
  onModeChange,
  onStart,
  incomingChallenge = false,
}: CoachFoyerProps) {
  const foyer = getIntentDef('understand').foyer;
  const { triggerHaptic } = useHapticFeedback();
  const { immersive, setImmersive } = useImmersive();
  const [coachStatus, setCoachStatus] = useState<StationStatus>(coachStation.status);
  const [showExtras, setShowExtras] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showFrameGuide, setShowFrameGuide] = useState(false);
  const extrasTouchedRef = useRef(false);
  const firstExtraRef = useRef<HTMLButtonElement>(null);
  const moreToggleRef = useRef<HTMLButtonElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewRequestRef = useRef(0);
  const [previewStatus, setPreviewStatus] = useState<'closed' | 'starting' | 'ready' | 'error'>(
    'closed'
  );
  const [previewError, setPreviewError] = useState<string | null>(null);

  const primaryExercises = exercises.filter((e) => e.category === 'primary');
  const extraExercises = exercises.filter((e) => e.category === 'extra');
  const selectedExercise = exercises.find((exercise) => exercise.mode === mode) ?? exercises[0];

  const stopCameraPreview = useCallback(() => {
    previewRequestRef.current += 1;
    if (previewStreamRef.current) {
      cleanupCameraStream(previewStreamRef.current);
      previewStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    setPreviewStatus('closed');
    setPreviewError(null);
  }, []);

  const startCameraPreview = useCallback(async () => {
    if (previewStatus === 'starting' || previewStreamRef.current) return;

    const requestId = ++previewRequestRef.current;
    setPreviewStatus('starting');
    setPreviewError(null);

    const result = await requestCameraPermission({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
      audio: false,
    });

    if (requestId !== previewRequestRef.current) {
      if (result.stream) cleanupCameraStream(result.stream);
      return;
    }

    if (!result.granted || !result.stream) {
      setPreviewStatus('error');
      setPreviewError('Camera preview was not available. You can still start and try again.');
      return;
    }

    previewStreamRef.current = result.stream;
    setPreviewStatus('ready');
  }, [previewStatus]);

  useEffect(() => {
    const video = previewVideoRef.current;
    const stream = previewStreamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => {
      setPreviewError('Preview opened, but the browser needs a tap on the video to play it.');
    });

    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [previewStatus]);

  useEffect(() => {
    return () => {
      previewRequestRef.current += 1;
      if (previewStreamRef.current) {
        cleanupCameraStream(previewStreamRef.current);
        previewStreamRef.current = null;
      }
    };
  }, []);

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

  const handleStart = () => {
    stopCameraPreview();
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
        style={{ animationDelay: `${180 + index * 40}ms` }}
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
      <div className="coach-foyer__atmosphere" aria-hidden="true">
        <div className="coach-foyer__glow" />
        <div className="coach-foyer__grid" />
        <div className="coach-foyer__orbit" />
      </div>

      <div className="coach-foyer__inner">
        <p className="coach-foyer__brand motion-enter motion-delay-1">{foyer.brand}</p>

        <h2 id="coach-foyer-title" className="coach-foyer__title motion-enter motion-delay-2">
          {foyer.line1}
        </h2>
        <p className="coach-foyer__lede motion-enter motion-delay-2">{foyer.line2}</p>

        {incomingChallenge && (
          <div
            className="coach-foyer__incoming-challenge motion-enter"
            role="status"
            aria-live="polite"
          >
            <div className="coach-foyer__incoming-challenge-mark" aria-hidden="true">
              <Sparkles size={16} strokeWidth={2} />
            </div>
            <div>
              <strong>A movement line was sent to you</strong>
              <span>Meet the ghost, try the same movement, and find your own correction.</span>
            </div>
          </div>
        )}

        <div
          className={`coach-foyer__coach-status is-${coachStation.enabled ? coachStatus : 'camera-only'} motion-enter`}
          style={{ animationDelay: '150ms' }}
          role="status"
          aria-live="polite"
        >
          <span className="coach-foyer__coach-status-dot" aria-hidden="true" />
          <span>
            {coachStation.enabled && coachStatus === 'connected'
              ? 'Coach bay connected · camera coaching ready'
              : coachStation.enabled && coachStatus === 'connecting'
                ? 'Coach bay connecting · camera coaching ready'
                : coachStation.enabled
                  ? 'Camera coaching ready · coach bay offline'
                  : 'Private camera coaching · robot shows the fix when connected'}
          </span>
        </div>

        {/* Two defaults, pre-answered — the only decision offered before START */}
        <fieldset className="coach-foyer__exercise-list motion-enter motion-delay-3">
          <legend className="sr-only">Pick a movement</legend>
          {primaryExercises.map(renderExerciseButton)}
        </fieldset>

        {/* The chosen movement comes alive before the camera does — the pick
            becomes a moment. Keyed by mode so switching restarts the loop. */}
        <div className="coach-foyer__preview-wrap motion-enter motion-delay-3">
          <MovementPreview key={mode} mode={mode} label={selectedExercise.label} />
        </div>

        <button
          type="button"
          id="startButton"
          className="coach-foyer__start coach-foyer__start--hero feel-press motion-enter"
          style={{ animationDelay: '320ms' }}
          aria-label={`Try one rep of ${selectedExercise.label} with camera coaching`}
          disabled={previewStatus === 'starting'}
          onPointerEnter={prefetchWebcamChunk}
          onTouchStart={prefetchWebcamChunk}
          onClick={handleStart}
        >
          <Camera size={18} strokeWidth={2} aria-hidden="true" />
          <span>{incomingChallenge ? 'Meet the ghost' : 'Try one rep'}</span>
          <span className="coach-foyer__start-mode" aria-hidden="true">
            · {selectedExercise.label}
          </span>
          <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <p
          className="coach-foyer__trust coach-foyer__trust--under-start motion-enter"
          style={{ animationDelay: '380ms' }}
        >
          <LockKeyhole size={14} strokeWidth={2} aria-hidden="true" />
          {BRAND.trustLine}
        </p>
        <div className="coach-foyer__story-links coach-foyer__story-links--secondary motion-enter">
          <button
            type="button"
            className="coach-foyer__how-it-works-toggle"
            aria-expanded={showHowItWorks}
            aria-controls="coach-foyer-loop"
            onClick={() => {
              playStudioCue('soft');
              triggerHaptic(40);
              setShowHowItWorks((prev) => !prev);
            }}
          >
            {showHowItWorks ? 'Hide how it works' : 'How it works'}
            {showHowItWorks ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="coach-foyer__how-it-works-toggle"
            aria-expanded={showFrameGuide}
            aria-controls="coach-foyer-frame"
            onClick={() => {
              playStudioCue('soft');
              triggerHaptic(40);
              setShowFrameGuide((prev) => {
                if (prev) stopCameraPreview();
                return !prev;
              });
            }}
          >
            {showFrameGuide ? 'Hide framing' : 'Set your frame'}
            {showFrameGuide ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
          </button>
          <a href="/lore" className="coach-foyer__why-robot-link">
            Why a physical coach? <ArrowRight size={13} aria-hidden="true" />
          </a>
        </div>

        {showFrameGuide && (
          <div
            id="coach-foyer-frame"
            className="coach-foyer__setup-guide motion-enter"
            role="note"
            aria-label="Camera setup"
          >
            <div className="coach-foyer__setup-guide-heading">
              <Camera size={15} strokeWidth={2} aria-hidden="true" />
              <strong>Set your frame</strong>
              <span
                className={`coach-foyer__setup-guide-status${previewStatus === 'ready' ? ' is-live' : ''}`}
              >
                {previewStatus === 'ready' ? 'Camera preview on' : 'Camera stays off'}
              </span>
            </div>
            <div className="coach-foyer__setup-layout">
              {previewStatus === 'ready' ? (
                <div className="coach-foyer__frame-visual coach-foyer__frame-visual--live">
                  <div className="coach-foyer__frame-visual-label">
                    <Camera size={11} strokeWidth={2} />
                    Live framing preview
                  </div>
                  <div className="coach-foyer__frame-live-window">
                    <video
                      ref={previewVideoRef}
                      className="coach-foyer__frame-live-video"
                      muted
                      playsInline
                      autoPlay
                      onClick={(event) => {
                        void event.currentTarget
                          .play()
                          .then(() => setPreviewError(null))
                          .catch(() => undefined);
                      }}
                      aria-label="Live camera framing preview"
                    />
                    <span className="coach-foyer__frame-live-target" aria-hidden="true" />
                    <span className="coach-foyer__frame-live-caption" aria-hidden="true">
                      {mode === 'curls' ? 'Keep head + hips visible' : 'Keep full body visible'}
                    </span>
                  </div>
                </div>
              ) : (
                <FramingDiagram mode={mode} />
              )}
              <div className="coach-foyer__setup-guide-grid">
                <span>
                  <b>Distance</b>
                  Start far enough back that the required landmarks fit comfortably; most desktop
                  setups need about 1.5–2.5 m.
                </span>
                <span>
                  <b>In view</b>
                  {mode === 'curls'
                    ? 'For curls, keep your head, shoulders, hips and both arms visible.'
                    : mode === 'pushups'
                      ? 'For push-ups, include your head, shoulders, hips, knees and feet.'
                      : 'For this move, keep your full body and both feet visible.'}
                </span>
                <span>
                  <b>Light</b>
                  Face a light source and clear the space behind you. Keep the camera still.
                </span>
              </div>
            </div>
            <div className="coach-foyer__setup-guide-actions">
              <button
                type="button"
                className="coach-foyer__preview-toggle"
                onClick={previewStatus === 'ready' ? stopCameraPreview : startCameraPreview}
                disabled={previewStatus === 'starting'}
                aria-pressed={previewStatus === 'ready'}
              >
                <Camera size={14} strokeWidth={2} aria-hidden="true" />
                {previewStatus === 'starting'
                  ? 'Opening camera…'
                  : previewStatus === 'ready'
                    ? 'Hide camera preview'
                    : 'Preview my framing'}
              </button>
              {previewError && (
                <span className="coach-foyer__preview-error" role="status" aria-live="polite">
                  {previewError}
                </span>
              )}
              {previewStatus === 'ready' && previewError && (
                <button
                  type="button"
                  className="coach-foyer__preview-play"
                  onClick={() => {
                    const video = previewVideoRef.current;
                    if (!video) return;
                    void video
                      .play()
                      .then(() => setPreviewError(null))
                      .catch(() => undefined);
                  }}
                >
                  Play preview
                </button>
              )}
            </div>
            <p className="coach-foyer__setup-guide-note">
              {previewStatus === 'ready'
                ? 'Preview is local and temporary. It stops when you hide it or start the session.'
                : 'The live camera stays off until you preview or start a rep.'}
            </p>
          </div>
        )}

        {showHowItWorks && (
          <div id="coach-foyer-loop" className="coach-foyer__how-it-works motion-enter">
            <CoachSystemMap status={coachStatus} enabled={coachStation.enabled} />
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
            <div className="coach-foyer__credibility-row coach-foyer__credibility-row--disclosed">
              <p className="coach-foyer__credibility">
                SO-101 physical coach · Cyberwave bridge · when connected
              </p>
              <a href="/collaborate" className="coach-foyer__collaborate-link">
                Help make the coach <ArrowRight size={11} aria-hidden="true" />
              </a>
            </div>
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

        {/* Sandow lineage stamp — always in the main flow. Immersive mode
            still unlocks denser heritage copy; the grade line itself is not opt-in. */}
        <p className="sandow-lineage motion-enter" style={{ animationDelay: '420ms' }}>
          <a href="/lore" className="sandow-lineage__link">
            {BRAND.sandowGrade}
          </a>
        </p>

        {/* The robot-native proof case is signposted on the Curls card itself;
            the credibility line stays secondary to the user's coaching need. */}
        <button
          type="button"
          ref={moreToggleRef}
          className="coach-foyer__more motion-enter"
          style={{ animationDelay: '420ms' }}
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
            className="coach-foyer__exercise-list motion-enter"
          >
            <legend>More movements</legend>
            {extraExercises.map(renderExerciseButton)}
          </fieldset>
        )}
      </div>
    </section>
  );
}

export default CoachFoyer;
