'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, PersonStanding, RotateCcw } from 'lucide-react';
import BodyPlate from '@/components/body/BodyPlate';
import { NIGGLE_JOINTS, getNiggleJoint, type NiggleJointId } from '@/lib/niggleIntents';
import { addNiggleEntry } from '@/lib/niggleEntries';
import { useNiggle } from '@/hooks/useNiggle';
import SendTheMeter from '@/components/receive/SendTheMeter';
import StretchSequence from '@/components/recovery/StretchSequence';

type PainExitVariant = 'pain' | 'stalled' | 'stalled-no-signal' | 'meter-couldnt-wake';

type PainExitProps = {
  /** Return path — back to the foyer, never a retry. */
  onDone: () => void;
  /** 'pain' = stop-for-pain surface (default);
   *  'stalled' = the arm never reached the overhead line — still information;
   *  'stalled-no-signal' = same stop, but the meter never locked a pose, so
   *    the copy must not claim a body result;
   *  'meter-couldnt-wake' = the model never loaded — a connection problem,
   *    not a reading. */
  variant?: PainExitVariant;
  /** Retry door for the signal/load failures — re-runs the session start.
   *  Never shown on the pain surface (rest first). */
  onRetry?: () => void;
};

/**
 * The designed pain exit (docs/PHASE_B_PLAN §B2). Stopping for pain is the
 * correct use of the meter, never a failure state — the surface says so in
 * the instrument's voice and offers to mark where it hurt. A mark lands in
 * the niggle logbook as context, not a measurement (DESIGN_EVOLUTION §F).
 *
 * The stalled variants land the same way when a reading never gets a rep:
 * tracked-but-never-reached keeps the "arms didn't reach" copy; a session
 * where the meter never saw a body gets honest signal copy instead. A
 * detector that never loaded gets its own surface — "the meter couldn't
 * wake" is a connection problem, not a reading.
 *
 * SendTheMeter renders collapsed on every variant here — the full field
 * stack overflows a phone viewport on top of the exit copy.
 */
export function PainExit({ onDone, variant = 'pain', onRetry }: PainExitProps) {
  const { joint, context, hydrated } = useNiggle();
  const [marked, setMarked] = useState<NiggleJointId | null>(null);
  const [logged, setLogged] = useState(false);
  const [easing, setEasing] = useState(false);
  // Preselect the intake joint once storage hydrates — that is the niggle
  // the reading was for — but never overwrite a tap the user already made.
  const touchedRef = useRef(false);
  useEffect(() => {
    if (hydrated && !touchedRef.current) setMarked(joint?.id ?? null);
  }, [hydrated, joint]);

  // A stalled reading logs itself once — no measurement was saved, only an
  // honest note about *why* it stalled: the arm, or the signal.
  const stallLoggedRef = useRef(false);
  useEffect(() => {
    if (variant !== 'stalled' && variant !== 'stalled-no-signal') return;
    if (!hydrated || stallLoggedRef.current) return;
    stallLoggedRef.current = true;
    addNiggleEntry({
      joint: joint?.id ?? 'neck-shoulders',
      context: context?.label,
      note:
        variant === 'stalled-no-signal'
          ? 'Reading stalled — the meter never got a clear signal'
          : 'Reading stalled — arm did not reach the overhead line',
    });
  }, [variant, hydrated, joint, context]);

  // The quiet "maybe it helps someone you know" door — the reading's own
  // joint when one is stored, else neck & shoulders (the reading this
  // surface most often serves). The send card is the same one the foyer
  // unfold and the recap carry — collapsed here so the exit fits a phone.
  const sendJoint = joint ?? getNiggleJoint('neck-shoulders');

  const markJoint = (id: NiggleJointId) => {
    touchedRef.current = true;
    if (marked === id) {
      setMarked(null);
      return;
    }
    setMarked(id);
    addNiggleEntry({ joint: id, note: 'Stopped a reading for pain' });
    setLogged(true);
  };

  if (variant === 'meter-couldnt-wake') {
    return (
      <section className="pain-exit" aria-labelledby="pain-exit-title">
        <div className="pain-exit__panel motion-enter">
          <p className="pain-exit__eyebrow">The meter didn&rsquo;t wake</p>
          <h2 id="pain-exit-title">That&rsquo;s a connection, not a body.</h2>
          <p className="pain-exit__copy">
            The meter couldn&rsquo;t wake — the model never arrived, so nothing was measured and
            nothing was saved. Check your connection and try again.
          </p>

          {sendJoint && (
            <SendTheMeter
              joint={sendJoint}
              contextId={context?.id}
              giftLine={context?.giftLine}
              lead="Maybe it helps someone you know."
              surface="pain-exit"
              collapsed
            />
          )}

          {onRetry && (
            <button type="button" className="pain-exit__cta" onClick={onRetry}>
              <RotateCcw size={15} aria-hidden="true" />
              <span>Try again</span>
            </button>
          )}

          <button type="button" className="pain-exit__cta" onClick={onDone}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Back to the foyer</span>
          </button>
        </div>
      </section>
    );
  }

  if (variant === 'stalled' || variant === 'stalled-no-signal') {
    const noSignal = variant === 'stalled-no-signal';
    return (
      <section className="pain-exit" aria-labelledby="pain-exit-title">
        <div className="pain-exit__panel motion-enter">
          <p className="pain-exit__eyebrow">Reading paused</p>
          <h2 id="pain-exit-title">
            {noSignal ? 'It couldn&rsquo;t quite see you.' : 'That&rsquo;s information too.'}
          </h2>
          <p className="pain-exit__copy">
            {noSignal
              ? 'The meter couldn\u2019t see you clearly this time — check your framing and the light, and try again. No reading is saved; it\u2019s noted in your logbook.'
              : 'Your arms didn\u2019t reach the overhead line this time. That\u2019s worth knowing — no reading is saved, and it\u2019s noted in your logbook. Try again another day, only as high as feels comfortable.'}
          </p>

          {sendJoint && (
            <SendTheMeter
              joint={sendJoint}
              contextId={context?.id}
              giftLine={context?.giftLine}
              lead="Maybe it helps someone you know."
              surface="pain-exit"
              collapsed
            />
          )}

          {easing ? (
            <StretchSequence mode="reach" tone="dark" onComplete={() => setEasing(false)} />
          ) : (
            <button type="button" className="pain-exit__cta" onClick={() => setEasing(true)}>
              <PersonStanding size={15} aria-hidden="true" />
              <span>Ease it</span>
            </button>
          )}

          {onRetry && (
            <button type="button" className="pain-exit__cta" onClick={onRetry}>
              <RotateCcw size={15} aria-hidden="true" />
              <span>Try again</span>
            </button>
          )}

          <button type="button" className="pain-exit__cta" onClick={onDone}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Back to the foyer</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pain-exit" aria-labelledby="pain-exit-title">
      <div className="pain-exit__panel motion-enter">
        <p className="pain-exit__eyebrow">Reading stopped</p>
        <h2 id="pain-exit-title">That&rsquo;s the right call.</h2>
        <p className="pain-exit__copy">
          A meter shouldn&rsquo;t hurt to use. Pain is a stop signal, not a rep to push through — if
          it persists or sharpens, see a professional. The meter will be here when it settles.
        </p>

        {sendJoint && (
          <SendTheMeter
            joint={sendJoint}
            contextId={context?.id}
            giftLine={context?.giftLine}
            lead="Maybe it helps someone you know."
            surface="pain-exit"
            collapsed
          />
        )}

        <div className="pain-exit__mark">
          <p className="pain-exit__mark-label">Mark where it hurt — it goes in your logbook.</p>
          <div className="pain-exit__mark-body">
            <BodyPlate selected={marked} onSelect={markJoint} />
            <div className="pain-exit__chips" role="group" aria-label="Where did it hurt?">
              {NIGGLE_JOINTS.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  className={`pain-exit__chip${marked === j.id ? ' is-selected' : ''}`}
                  aria-pressed={marked === j.id}
                  onClick={() => markJoint(j.id)}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>
          <p className="pain-exit__logged" role="status" aria-live="polite">
            {logged && 'Noted in your logbook — context, not a measurement.'}
          </p>
        </div>

        <button type="button" className="pain-exit__cta" onClick={onDone}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back to the foyer</span>
        </button>
      </div>
    </section>
  );
}

export default PainExit;
