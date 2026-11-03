'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, ChevronDown, Eye, Hand, Sparkles } from 'lucide-react';
import type { ExerciseMode } from '@/utils/biomechanics';
import { cleanupCameraStream, requestCameraPermission } from '@/utils/cameraPermissions';
import { playStudioCue } from '@/lib/uiSound';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { FORM_CHECK_THRESHOLDS } from '@/lib/coachingEngine';
import { describeChecks, PAIN_INTENTS, type PainIntent } from '@/lib/painIntents';
import '@/styles/landing-sections.css';

type LandingSectionsProps = {
  mode: ExerciseMode;
  selectedExerciseLabel: string;
  onStart: () => void;
  /** Reading-mode CTA ("Take a 5-rep reading") — defaults to "Try one rep". */
  finalCtaLabel?: string;
  /** Optional looping clip for the coach-arm figure; falls back to the still. */
  clipSrc?: string;
  /** Selected pain-intent chip; null = default page. */
  painIntent?: PainIntent | null;
};

const ARM_STILL = '/atmosphere/so101-follower-cutout.webp';
const ARM_ALT = 'The SO-101 coach arm, a small desktop robot arm used to demonstrate corrections';

const howItWorks = [
  {
    icon: Eye,
    title: 'Camera reads your form',
    body: 'Pose detection runs on your device. No video upload.',
  },
  {
    icon: Hand,
    title: 'Coach names one fix',
    body: 'Live cues explain what to change while you move.',
  },
  {
    icon: Sparkles,
    title: 'The arm shows it',
    body: 'For upper body corrections, the coach arm can demonstrate the movement in the bay when connected.',
  },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Does video leave my device?',
    a: 'No. Pose detection runs on your device in the browser. No video is uploaded, and the optional framing preview is local and temporary.',
  },
  {
    q: 'Which movements are included, and which get the arm demo?',
    a: 'Curls and push-ups are up front, with squats, pull-ups and jumps behind More movements. The coach arm demonstrates upper body corrections such as curls when the coach bay is connected.',
  },
  {
    q: 'Do I need the coach arm?',
    a: 'No. The on screen coach shows the same fix. The arm is a physical demonstration for when the coach bay is connected.',
  },
  {
    q: 'Do I need a wallet?',
    a: 'No. The coaching loop works with no wallet and no sign in. Connecting a wallet is optional.',
  },
  {
    q: 'What is saved, and where?',
    a: "Your set is stored on your device as a movement read, and a later session compares against it. The 'what brings you here' choice is saved only in this browser's storage. Nothing is uploaded.",
  },
  {
    q: 'How should I set up the camera?',
    a: 'Stand about 1.5 to 2.5 m back so the required landmarks fit, face a light source, and keep the camera still.',
  },
];

/** One-shot rise + fade reveal on intersection (no scroll listeners). */
function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-in');
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`ls-reveal ${className}`}>
      {children}
    </div>
  );
}

/**
 * Per-word tagline reveal: each word starts at ~30% opacity and transitions to
 * full colour in reading order as it crosses a trigger line. One observer per
 * word; reduced-motion renders the final colour immediately.
 */
function RevealWords({
  text,
  className = '',
  brassWord,
  suffix,
}: {
  text: string;
  className?: string;
  /** Optional word rendered after the text, held in brass. */
  brassWord?: string;
  /** Literal space suffix before the brass word. */
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-revealed');
      return;
    }
    const words = Array.from(el.querySelectorAll('.ls-word'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-on');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -30% 0px', threshold: 0 }
    );
    words.forEach((word) => io.observe(word));
    return () => io.disconnect();
  }, []);

  const words = text.split(' ');
  return (
    <span ref={ref} className={`ls-words ${className}`}>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span className="ls-word">{word}</span>
          {i < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
      {brassWord ? (
        <>
          {suffix ?? ' '}
          <span className="ls-word ls-word--brass">{brassWord}</span>
        </>
      ) : null}
    </span>
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

/** "Set your frame" disclosure — diagram plus an optional local live preview. */
function FrameGuide({ mode }: { mode: ExerciseMode }) {
  const { triggerHaptic } = useHapticFeedback();
  const [open, setOpen] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewRequestRef = useRef(0);
  const [previewStatus, setPreviewStatus] = useState<'closed' | 'starting' | 'ready' | 'error'>(
    'closed'
  );
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  return (
    <div className="ls-frame">
      <button
        type="button"
        className="coach-foyer__how-it-works-toggle"
        aria-expanded={open}
        aria-controls="ls-frame-guide"
        onClick={() => {
          playStudioCue('soft');
          triggerHaptic(40);
          setOpen((prev) => {
            if (prev) stopCameraPreview();
            return !prev;
          });
        }}
      >
        {open ? 'Hide framing' : 'Set your frame'}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={open ? 'ls-chevron is-open' : 'ls-chevron'}
        />
      </button>

      {open && (
        <div
          id="ls-frame-guide"
          className="coach-foyer__setup-guide ls-frame__guide"
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
    </div>
  );
}

/** Plate II — the SO-101 photo framed as an engraved plate, with a slight
    perspective tilt toward the cursor (pointer-fine only, off for reduced
    motion) and a slow idle float. */
function ArmPlate({ clipSrc }: { clipSrc?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const ny = (e.clientY - (r.top + r.height / 2)) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(800px) rotateY(${Math.max(-8, Math.min(8, nx * 7))}deg) rotateX(${Math.max(-8, Math.min(8, -ny * 6))}deg)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <figure className="ls-plate ls-arm__plate">
      <div className="ls-plate__caption">
        <span className="ls-plate__caption-num">PLATE II</span>
        <span className="ls-plate__caption-sep">·</span>
        <span>THE COACH ARM</span>
      </div>
      <div className="ls-plate__media" ref={ref}>
        {clipSrc ? (
          <video
            className="ls-plate__img"
            src={clipSrc}
            poster={ARM_STILL}
            muted
            loop
            autoPlay
            playsInline
            aria-label={ARM_ALT}
          />
        ) : (
          <img
            className="ls-plate__img"
            src={ARM_STILL}
            alt={ARM_ALT}
            width={1280}
            height={960}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    </figure>
  );
}

export function LandingSections({
  mode,
  selectedExerciseLabel,
  onStart,
  finalCtaLabel = 'Try one rep',
  clipSrc,
  painIntent,
}: LandingSectionsProps) {
  const { triggerHaptic } = useHapticFeedback();

  const handleFinalStart = () => {
    playStudioCue('press');
    triggerHaptic([50, 100]);
    onStart();
  };

  // No chip selected -> show the 'unsure' beats with the pick-hint.
  const familiar = painIntent ?? PAIN_INTENTS[0];
  const familiarChecks = describeChecks(familiar.mode);

  return (
    <div className="ls">
      {/* 0 — Sound familiar? Reflects the selected chip. */}
      <Reveal className="ls-section ls-familiar">
        <h2 className="ls-h2">Sound familiar?</h2>
        {!painIntent && (
          <p className="ls-familiar__hint">
            Tap the closest match above to see your coaching plan.
          </p>
        )}
        <div className="ls-familiar__body lf-swap" key={familiar.id}>
          <div className="ls-familiar__beat">
            <span className="ls-familiar__num" aria-hidden="true">
              I
            </span>
            <div>
              <strong>What is happening</strong>
              <p>{familiar.pain}</p>
            </div>
          </div>
          <div className="ls-familiar__beat">
            <span className="ls-familiar__num" aria-hidden="true">
              II
            </span>
            <div>
              <strong>What the coach looks at</strong>
              <ul className="ls-familiar__checks">
                {familiarChecks.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="ls-familiar__beat">
            <span className="ls-familiar__num" aria-hidden="true">
              III
            </span>
            <div>
              <strong>What you will see on rep one</strong>
              <p>{familiar.firstRepLine}</p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 1 — Plate II, the coach arm */}
      <Reveal className="ls-section ls-arm">
        <h2 className="ls-h2">Meet the coach arm</h2>
        <div className="ls-arm__grid">
          <ArmPlate clipSrc={clipSrc} />
          <div className="ls-arm__copy">
            <p className="ls-caption">
              SO-101 coach arm. It demonstrates upper body corrections such as curls when the coach
              bay is connected. Without it, the on screen coach shows the same fix.
            </p>
            <a href="/lore" className="ls-link">
              How the arm works <ArrowRight size={13} aria-hidden="true" />
            </a>
            <p className="ls-engraved">After Sandow&apos;s 1897 plates</p>
          </div>
        </div>
      </Reveal>

      {/* 2 — How it works */}
      <Reveal className="ls-section ls-how">
        <h2 className="ls-h2">How it works</h2>
        <ol className="ls-steps">
          {howItWorks.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="ls-steps__item">
                <span className="ls-steps__num" aria-hidden="true">
                  {['I', 'II', 'III'][i]}
                </span>
                <Icon size={18} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </div>
              </li>
            );
          })}
        </ol>
        <FrameGuide mode={mode} />
      </Reveal>

      {/* 3 — Tagline reveal */}
      <Reveal className="ls-section ls-tagline">
        <p className="ls-tagline__line">
          <RevealWords text="One rep. One" brassWord="fix." />
        </p>
        <p className="ls-tagline__line">
          <RevealWords text="See the difference on the next rep." />
        </p>
      </Reveal>

      {/* 4 — Why you can trust it */}
      <Reveal className="ls-section ls-trust">
        <h2 className="ls-h2">Why you can trust it</h2>
        <div className="ls-trust__grid">
          <div className="ls-trust__item">
            <h3>See every check</h3>
            <details className="ls-trust__details">
              <summary>
                All gates, with the numbers{' '}
                <ChevronDown size={14} className="ls-chevron" aria-hidden="true" />
              </summary>
              <table className="ls-trust__table">
                <tbody>
                  <tr>
                    <td>Range of motion</td>
                    <td>
                      critical &lt; {FORM_CHECK_THRESHOLDS.depth.critical}, flag &lt;{' '}
                      {FORM_CHECK_THRESHOLDS.depth.warning}, good {FORM_CHECK_THRESHOLDS.depth.good}
                    </td>
                    <td>not graded on curls</td>
                  </tr>
                  <tr>
                    <td>Forward lean</td>
                    <td>
                      flag &gt; {FORM_CHECK_THRESHOLDS.trunkLean.warning} deg (
                      {FORM_CHECK_THRESHOLDS.trunkLean.squatsWarning} deg squats), critical &gt;{' '}
                      {FORM_CHECK_THRESHOLDS.trunkLean.critical} deg
                    </td>
                    <td>all moves</td>
                  </tr>
                  <tr>
                    <td>Knee valgus</td>
                    <td>
                      flag &gt; {FORM_CHECK_THRESHOLDS.kneeValgus.warning} deg, critical &gt;{' '}
                      {FORM_CHECK_THRESHOLDS.kneeValgus.critical} deg
                    </td>
                    <td>all moves</td>
                  </tr>
                  <tr>
                    <td>Ankle mobility</td>
                    <td>
                      noted &lt; {FORM_CHECK_THRESHOLDS.ankleFlexion.info} deg, target{' '}
                      {FORM_CHECK_THRESHOLDS.ankleFlexion.target} deg
                    </td>
                    <td>squats only</td>
                  </tr>
                  <tr>
                    <td>Left/right balance</td>
                    <td>
                      flag &lt; {FORM_CHECK_THRESHOLDS.symmetry.warning}, target{' '}
                      {FORM_CHECK_THRESHOLDS.symmetry.target}
                    </td>
                    <td>all moves</td>
                  </tr>
                </tbody>
              </table>
            </details>
          </div>
          <div className="ls-trust__item">
            <h3>What stays on your device</h3>
            <p>
              Video is never uploaded and pose detection runs in your browser. Saved reads live in
              this browser&apos;s storage. Farcaster mini app users can send product engagement
              events such as app launched or workout completed; for a plain browser visit nothing is
              sent.
            </p>
          </div>
          <div className="ls-trust__item">
            <h3>How sure it is</h3>
            <p>
              Each read carries a confidence label. Clear read means the signal was strong enough to
              act on. Usable read means the read is sound but noisier. Early read means treat it as
              a first estimate, not a verdict.
            </p>
          </div>
          <div className="ls-trust__item">
            <h3>What it cannot do</h3>
            <p>
              This is general wellness guidance, not medical advice or a clinical test, and it does
              not compare you to any population. A single 2D camera has limits: framing, light and
              angle matter. The arm demo is upper body only and only when a coach bay is connected.
              We have a written test and retest protocol and have not published results yet.
            </p>
          </div>
        </div>
      </Reveal>

      {/* 5 — FAQ */}
      <Reveal className="ls-section ls-faq">
        <h2 className="ls-h2">Common questions</h2>
        <div className="ls-faq__list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="ls-faq__item">
              <summary>
                <span>{item.q}</span>
                <ChevronDown size={15} aria-hidden="true" className="ls-chevron" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </Reveal>

      {/* 6 — Final CTA */}
      <Reveal className="ls-section ls-final">
        <h2 className="ls-h2 ls-final__title">Try one rep.</h2>
        {painIntent && <p className="ls-final__note">Your first read: {selectedExerciseLabel}.</p>}
        <button
          type="button"
          className="coach-foyer__start feel-press"
          aria-label={`Try one rep of ${selectedExerciseLabel} with camera coaching`}
          onClick={handleFinalStart}
        >
          <Camera size={18} strokeWidth={2} aria-hidden="true" />
          <span>{finalCtaLabel}</span>
          <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </Reveal>
    </div>
  );
}

export default LandingSections;
