'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, ChevronDown, Send } from 'lucide-react';
import { playStudioCue } from '@/lib/uiSound';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import {
  getNiggleJoint,
  NIGGLE_JOINTS,
  SENT_BY_KEY,
  parseStoredNiggle,
  NIGGLE_KEY,
  type NiggleJointId,
  type StoredNiggle,
} from '@/lib/niggleIntents';
import { assessmentProtocolFor } from '@/lib/movementAssessment';
import { useNiggle } from '@/hooks/useNiggle';
import BodyPlate from '@/components/body/BodyPlate';
import { prefetchWebcamChunk, prefersReducedMotion } from '@/components/game/CoachFoyer';
import type { ExerciseMode } from '@/utils/biomechanics';
import { FAQ_ITEMS } from '@/components/home/LandingSections';
import ReachPlate from '@/components/receive/ReachPlate';
import {
  useArmCycle,
  usePrefersReducedMotion,
  useReceivingScroll,
  pixelDissolve,
} from '@/components/receive/useReceivingMotion';
import '@/styles/coach-foyer.css';
import '@/styles/landing-sections.css';
import '@/styles/receiving-foyer.css';

type ReceivingFoyerProps = {
  mode: ExerciseMode;
  onModeChange: (mode: ExerciseMode) => void;
  onStart: () => void;
};

/** Same-session repeat views skip the envelope straight to Act 1. */
const ENVELOPE_SEEN_KEY = 'imf_rf_envelope_v1';

/** Joint-aware short phrase for "Your ___, measured." */
const JOINT_PHRASE: Record<NiggleJointId, string> = {
  'neck-shoulders': 'neck & shoulders',
  back: 'lower back',
  knee: 'knee',
  arm: 'arm',
  'not-sure': 'movement',
};

/** Joint-aware zone for the Beat-2 epidemiology line. */
const JOINT_DISCOMFORT: Record<NiggleJointId, string> = {
  'neck-shoulders': 'neck-and-shoulder',
  back: 'lower-back',
  knee: 'knee',
  arm: 'arm',
  'not-sure': 'musculoskeletal',
};

type EnvelopePhase = 'show' | 'dissolving' | 'done';

export function ReceivingFoyer({ mode, onModeChange, onStart }: ReceivingFoyerProps) {
  const reduced = usePrefersReducedMotion();
  const { triggerHaptic } = useHapticFeedback();
  const niggle = useNiggle();

  // The stored intake is written by Game's URL-param effect before this
  // foyer mounts — read it lazily so first paint already greets the right
  // joint (useNiggle hydrates one effect later and takes over from there).
  const [initialStored] = useState<StoredNiggle | null>(() =>
    typeof window === 'undefined' ? null : parseStoredNiggle(localStorage.getItem(NIGGLE_KEY))
  );
  const joint = niggle.hydrated ? niggle.joint : getNiggleJoint(initialStored?.joint);
  const context = niggle.context;
  const { setJoint, setContext } = niggle;

  const [sentBy, setSentBy] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [beat3Progress, setBeat3Progress] = useState(() =>
    typeof window !== 'undefined' && prefersReducedMotion() ? 1 : 0.35
  );

  const rootRef = useRef<HTMLElement>(null);
  const heroPlateRef = useRef<HTMLDivElement>(null);
  const finalPlateRef = useRef<HTMLDivElement>(null);
  const beat3Ref = useRef<HTMLElement>(null);
  const envelopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const dissolveFastRef = useRef(false);

  useEffect(() => {
    setSentBy(localStorage.getItem(SENT_BY_KEY));
  }, []);

  const greeting = sentBy ? `${sentBy} sent you this` : 'A friend sent you this';

  // —— Act 0: the envelope ————————————————————————————————
  const [envelope, setEnvelope] = useState<EnvelopePhase>(() => {
    if (typeof window === 'undefined') return 'done';
    if (prefersReducedMotion() || sessionStorage.getItem(ENVELOPE_SEEN_KEY)) return 'done';
    return 'show';
  });

  const startDissolve = useCallback(
    (fast = false) => {
      if (envelope !== 'show') return;
      dissolveFastRef.current = fast;
      // Fill the dissolve canvas before the overlay's own background goes
      // transparent — same commit, no hero flash-through.
      const canvas = envelopeCanvasRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#061013';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      setEnvelope('dissolving');
    },
    [envelope]
  );

  // Auto-seam after ~1.2s.
  useEffect(() => {
    if (envelope !== 'show') return;
    const t = setTimeout(() => startDissolve(false), 1250);
    return () => clearTimeout(t);
  }, [envelope, startDissolve]);

  useEffect(() => {
    if (envelope !== 'dissolving') return;
    const canvas = envelopeCanvasRef.current;
    let alive = true;
    (async () => {
      if (canvas) {
        await pixelDissolve(canvas, {
          duration: dissolveFastRef.current ? 260 : 460,
          skipFill: true,
        });
      }
      if (alive) {
        sessionStorage.setItem(ENVELOPE_SEEN_KEY, '1');
        setEnvelope('done');
      }
    })();
    return () => {
      alive = false;
    };
  }, [envelope]);

  // —— Act 1: the living plate ————————————————————————————
  // The loop only spins once the envelope lifts (and never under reduced
  // motion — the figure rests at the raised pose with pips filled).
  const { progress, litPips, playRep, beginScrub, scrubTo, endScrub } = useArmCycle({
    active: envelope !== 'show',
    reduced,
  });

  // Scroll choreography — GSAP + ScrollTrigger dynamic, no-op when reduced.
  useReceivingScroll({
    rootRef,
    scrubRef: beat3Ref,
    enabled: envelope !== 'show',
    reduced,
    onScrubProgress: setBeat3Progress,
  });

  // Warm the camera + pose chunk while she reads — the OS prompt still only
  // fires on CTA press.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetchWebcamChunk, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(prefetchWebcamChunk, 1200);
    return () => clearTimeout(timer);
  }, []);

  // —— Tap = one slow rep; hold = scrub (pointer angle → arm angle) ————
  const scrubbingRef = useRef(false);
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const pointerToProgress = useCallback((clientX: number, clientY: number): number | null => {
    const svg = heroPlateRef.current?.querySelector('svg');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / 320, rect.height / 372);
    if (scale <= 0) return null;
    const ox = rect.left + (rect.width - 320 * scale) / 2;
    const oy = rect.top + (rect.height - 372 * scale) / 2;
    const px = (clientX - ox) / scale;
    const py = (clientY - oy) / scale;
    const angle = Math.atan2(px - 192, py - 142); // 0 = hanging, π = overhead
    return Math.min(1, Math.max(0, (angle - 0.1) / (Math.PI - 0.2)));
  }, []);

  const onPlatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    downRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    scrubbingRef.current = false;
  };

  const onPlatePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (!scrubbingRef.current && moved > 8) {
      scrubbingRef.current = true;
      heroPlateRef.current?.setPointerCapture?.(e.pointerId);
      beginScrub();
    }
    if (scrubbingRef.current) {
      const p = pointerToProgress(e.clientX, e.clientY);
      if (p != null) scrubTo(p);
    }
  };

  const onPlatePointerUp = () => {
    const down = downRef.current;
    downRef.current = null;
    if (scrubbingRef.current) {
      scrubbingRef.current = false;
      endScrub();
      return;
    }
    if (down && performance.now() - down.t < 400) {
      playStudioCue('soft');
      triggerHaptic(30);
      playRep();
    }
  };

  const onPlatePointerCancel = () => {
    downRef.current = null;
    if (scrubbingRef.current) {
      scrubbingRef.current = false;
      endScrub();
    }
  };

  // —— Act 3: the iris — the plate's frame becomes the HUD frame ————————
  const handleStart = (plate?: HTMLDivElement | null) => {
    playStudioCue('press');
    triggerHaptic([50, 100]);
    if (!reduced) plate?.classList.add('is-iris');
    onStart();
  };

  const handleSendToFriend = async () => {
    if (!joint) return;
    const url = `${window.location.origin}/?niggle=${joint.id}:${context?.id ?? joint.contexts[0].id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Take this reading', url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        return;
      }
      setShareStatus('copied');
      window.setTimeout(() => setShareStatus('idle'), 2500);
    } catch {
      /* share cancelled or clipboard unavailable — nothing to repair */
    }
  };

  const readingProtocol = joint ? assessmentProtocolFor(mode) : null;
  const ctaLabel = readingProtocol
    ? `Take a ${readingProtocol.targetReps}-rep reading`
    : 'Take a reading';
  const phrase = joint ? JOINT_PHRASE[joint.id] : 'movement';
  const discomfort = joint ? JOINT_DISCOMFORT[joint.id] : 'musculoskeletal';
  const ritualLine = readingProtocol
    ? `Once a week, same setup, ${readingProtocol.targetReps} slow raises.`
    : 'Once a week, same setup, a few slow reps.';

  const greetingWords = greeting.split(' ');

  return (
    <section
      ref={rootRef}
      className="receiving-foyer"
      aria-labelledby="rf-title"
      data-envelope={envelope}
    >
      <a className="coach-foyer__skip" href="#startButton">
        Skip to start
      </a>

      {/* ——— Act 0 — the envelope ——— */}
      {envelope !== 'done' && (
        <div
          className={`rf-envelope${envelope === 'dissolving' ? ' is-dissolving' : ''}`}
          onPointerDown={() => startDissolve(true)}
          aria-hidden="true"
        >
          <canvas ref={envelopeCanvasRef} className="rf-envelope__canvas" />
          <div className="rf-envelope__inner">
            <svg className="rf-envelope__ring" viewBox="0 0 240 240" focusable="false">
              <circle className="rf-envelope__ring-track" cx="120" cy="120" r="104" />
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * 30 * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    className="rf-envelope__ring-tick"
                    x1={120 + 98 * Math.cos(a)}
                    y1={120 + 98 * Math.sin(a)}
                    x2={120 + 104 * Math.cos(a)}
                    y2={120 + 104 * Math.sin(a)}
                  />
                );
              })}
              <circle className="rf-envelope__ring-draw" cx="120" cy="120" r="104" pathLength={1} />
            </svg>
            <p className="rf-envelope__greeting">
              {greetingWords.map((word, i) => (
                <span
                  key={i}
                  className="rf-envelope__word"
                  style={{ animationDelay: `${380 + i * 130}ms` }}
                >
                  {word}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      <div className="rf-inner">
        {/* ——— Act 1 — Fig 1, the living plate ——— */}
        <div className="rf-hero">
          <div
            ref={heroPlateRef}
            className="rf-plate rf-hero__plate"
            onPointerDown={onPlatePointerDown}
            onPointerMove={onPlatePointerMove}
            onPointerUp={onPlatePointerUp}
            onPointerCancel={onPlatePointerCancel}
            role="button"
            tabIndex={0}
            aria-label="Fig 1 — the reach. Tap to play one slow raise; hold and drag to move the arm."
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playRep();
              }
            }}
          >
            <ReachPlate progress={progress} litPips={litPips} />
            <span className="rf-plate__hint" aria-hidden="true">
              tap for one raise · hold to scrub
            </span>
          </div>

          <div className="rf-hero__copy">
            <p className="rf-sent-by">{greeting}</p>
            <h1 id="rf-title" className="rf-title">
              Your {phrase}, <em className="rf-title-brass">measured.</em>
            </h1>
            <p className="rf-line">
              {readingProtocol
                ? `${readingProtocol.targetReps} slow raises. The camera watches; nothing leaves your phone.`
                : 'Slow reps. The camera watches; nothing leaves your phone.'}
            </p>

            <button
              type="button"
              id="startButton"
              className="coach-foyer__start coach-foyer__start--hero feel-press rf-cta"
              onPointerEnter={prefetchWebcamChunk}
              onTouchStart={prefetchWebcamChunk}
              onClick={() => handleStart(heroPlateRef.current)}
            >
              <Camera size={18} strokeWidth={2} aria-hidden="true" />
              <span>{ctaLabel}</span>
              <ArrowRight
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className="coach-foyer__start-arrow"
              />
            </button>

            <button
              type="button"
              className="rf-change"
              aria-expanded={intakeOpen}
              aria-controls="rf-intake"
              onClick={() => {
                playStudioCue('soft');
                triggerHaptic(30);
                setIntakeOpen((v) => !v);
              }}
            >
              not your niggle? change it
            </button>

            <div id="rf-intake" className={`rf-intake${intakeOpen ? ' is-open' : ''}`}>
              <div className="rf-intake__content">
                {/* The standard intake — same markup/styles as the CoachFoyer
                    pain block, unfolded under the CTA. */}
                <div className="coach-foyer__pain" role="group" aria-label="Where does it nag?">
                  <span className="coach-foyer__pain-label">Where does it nag?</span>
                  <div className="coach-foyer__plate">
                    <BodyPlate
                      selected={joint?.id ?? null}
                      annotateAll
                      onSelect={(id) => {
                        playStudioCue('soft');
                        triggerHaptic(30);
                        if (joint?.id === id) {
                          setJoint(null);
                          return;
                        }
                        const j = getNiggleJoint(id);
                        if (!j) return;
                        setJoint(j.id);
                        onModeChange(j.mode);
                      }}
                    />
                    <div>
                      <div className="coach-foyer__pain-chips">
                        {NIGGLE_JOINTS.map((j) => {
                          const selected = joint?.id === j.id;
                          return (
                            <button
                              key={j.id}
                              type="button"
                              className={`coach-foyer__pain-chip${selected ? ' is-selected' : ''}`}
                              aria-pressed={selected}
                              onClick={(e) => {
                                playStudioCue('soft');
                                triggerHaptic(30);
                                if (selected) {
                                  setJoint(null);
                                  return;
                                }
                                setJoint(j.id);
                                onModeChange(j.mode);
                                e.currentTarget.scrollIntoView({
                                  inline: 'center',
                                  block: 'nearest',
                                  behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                                });
                              }}
                            >
                              {j.label}
                            </button>
                          );
                        })}
                      </div>
                      {joint && joint.contexts.length > 1 && (
                        <>
                          <span className="coach-foyer__pain-label">What does it do?</span>
                          <div className="coach-foyer__pain-chips">
                            {joint.contexts.map((c) => {
                              const selected = context?.id === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  className={`coach-foyer__pain-chip${selected ? ' is-selected' : ''}`}
                                  aria-pressed={selected}
                                  onClick={() => {
                                    playStudioCue('soft');
                                    triggerHaptic(30);
                                    setContext(c.id);
                                  }}
                                >
                                  {c.label}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                      {joint && (
                        <div className="coach-foyer__send">
                          <button
                            type="button"
                            className="coach-foyer__send-button"
                            onClick={() => void handleSendToFriend()}
                          >
                            <Send size={11} aria-hidden="true" />
                            Send this to a friend
                          </button>
                          <span
                            className="coach-foyer__send-status"
                            role="status"
                            aria-live="polite"
                          >
                            {shareStatus === 'copied' ? 'Link copied' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ——— Act 2 — five beats, a seam between each ——— */}
        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The question">
          <p className="rf-beat__eyebrow">The question</p>
          <h2 className="rf-beat__title">Tension can&rsquo;t be photographed.</h2>
          <p className="rf-beat__body">
            But how the arm travels can — range, control, left-right. A meter, not a mirror.
          </p>
          <div className="rf-beat__figure rf-beat__figure--plate">
            <ReachPlate progress={0.55} ghostBoost={1.7} pips={0} />
          </div>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The company">
          <p className="rf-beat__eyebrow">The company</p>
          <h2 className="rf-beat__title">You&rsquo;re in enormous, invisible company.</h2>
          <div className="rf-marks" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <svg
                key={i}
                className={`rf-mark${i === 1 || i === 3 ? ' is-lit' : ''}`}
                viewBox="0 0 24 34"
              >
                <circle cx="12" cy="7" r="4.5" />
                <path d="M6 16 Q12 13 18 16" />
                <line x1="12" y1="12" x2="12" y2="27" />
                <path d="M7 28 Q12 30 17 28" />
              </svg>
            ))}
          </div>
          <p className="rf-beat__body">
            Somewhere between one in five and two in five adults report {discomfort} discomfort in
            any three-month stretch — desk work makes it nearly universal. What isn&rsquo;t common
            is measuring it. Almost everyone guesses.
          </p>
          <p className="rf-beat__footnote">
            US CDC 2019, GP surveys — the table this instrument was designed from.
          </p>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section ref={beat3Ref} className="rf-beat" aria-label="The read">
          <p className="rf-beat__eyebrow">The read</p>
          <h2 className="rf-beat__title">The meter watches three things.</h2>
          <div className="rf-beat__figure rf-beat__figure--plate">
            <ReachPlate
              progress={beat3Progress}
              drawArc
              controlRing
              mirror
              ghostCount={2}
              pips={5}
            />
          </div>
          <p className="rf-read-labels" aria-hidden="true">
            <span className={beat3Progress > 0.05 ? 'is-lit' : ''}>Range</span>
            <span className="rf-read-labels__sep">·</span>
            <span className={beat3Progress > 0.38 ? 'is-lit' : ''}>Control</span>
            <span className="rf-read-labels__sep">·</span>
            <span className={beat3Progress > 0.7 ? 'is-lit' : ''}>Balance</span>
          </p>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The ritual">
          <p className="rf-beat__eyebrow">The ritual</p>
          <h2 className="rf-beat__title">A healthy way to hold a niggle.</h2>
          <p className="rf-beat__body">{ritualLine}</p>
          <div className="rf-ritual">
            <p className="rf-ritual__row">Feels better and the meter agrees — confidence.</p>
            <p className="rf-ritual__row">
              Numbers moved but it feels the same — healing on a schedule you can&rsquo;t feel yet.
            </p>
            <p className="rf-ritual__row">
              Hurts more and nothing moved — see a professional; that&rsquo;s the body&rsquo;s job,
              not the meter&rsquo;s.
            </p>
          </div>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The honesty">
          <p className="rf-beat__eyebrow">The honesty</p>
          <h2 className="rf-beat__title">A meter that can&rsquo;t read says so.</h2>
          <ul className="rf-ledger">
            <li>video never uploads</li>
            <li>reads stay in this browser</li>
            <li>wellness guidance, not medicine</li>
          </ul>
        </section>

        {/* ——— Outro ——— */}
        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-outro" aria-label="Common questions">
          <h2 className="rf-beat__title rf-outro__title">Common questions</h2>
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

          <div className="rf-final">
            <div ref={finalPlateRef} className="rf-plate rf-final__plate">
              <ReachPlate progress={0.62} ghostBoost={1.4} pips={5} litPips={3} />
            </div>
            <button
              type="button"
              className="coach-foyer__start feel-press rf-cta"
              onClick={() => handleStart(finalPlateRef.current)}
            >
              <Camera size={18} strokeWidth={2} aria-hidden="true" />
              <span>{ctaLabel}</span>
              <ArrowRight
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className="coach-foyer__start-arrow"
              />
            </button>
            <p className="coach-foyer__assist coach-foyer__assist--meter rf-final__note">
              A meter, not a diagnosis. If it hurts, stop.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}

export default ReceivingFoyer;
