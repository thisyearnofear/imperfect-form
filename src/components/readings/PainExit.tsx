'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, PersonStanding } from 'lucide-react';
import BodyPlate from '@/components/body/BodyPlate';
import { NIGGLE_JOINTS, getNiggleJoint, type NiggleJointId } from '@/lib/niggleIntents';
import { addNiggleEntry } from '@/lib/niggleEntries';
import { useNiggle } from '@/hooks/useNiggle';
import SendTheMeter from '@/components/receive/SendTheMeter';
import StretchSequence from '@/components/recovery/StretchSequence';

type PainExitProps = {
  /** Return path — back to the foyer, never a retry. */
  onDone: () => void;
  /** 'pain' = stop-for-pain surface (default); 'stalled' = the arm never
   *  reached the overhead line — still information, never a failure. */
  variant?: 'pain' | 'stalled';
};

/**
 * The designed pain exit (docs/PHASE_B_PLAN §B2). Stopping for pain is the
 * correct use of the meter, never a failure state — the surface says so in
 * the instrument's voice and offers to mark where it hurt. A mark lands in
 * the niggle logbook as context, not a measurement (DESIGN_EVOLUTION §F).
 *
 * The stalled variant lands the same way when a reading never gets a rep:
 * the logbook note is written automatically and the ease-it door is offered
 * instead of the pain mark.
 */
export function PainExit({ onDone, variant = 'pain' }: PainExitProps) {
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

  // A stalled reading logs itself once — no measurement was saved, only the
  // fact that the arm did not reach the line this time.
  const stallLoggedRef = useRef(false);
  useEffect(() => {
    if (variant !== 'stalled' || !hydrated || stallLoggedRef.current) return;
    stallLoggedRef.current = true;
    addNiggleEntry({
      joint: joint?.id ?? 'neck-shoulders',
      context: context?.label,
      note: 'Reading stalled — arm did not reach the overhead line',
    });
  }, [variant, hydrated, joint, context]);

  // The quiet "maybe it helps someone you know" door — the reading's own
  // joint when one is stored, else neck & shoulders (the reading this
  // surface most often serves). The send card is the same one the foyer
  // unfold and the recap carry.
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

  if (variant === 'stalled') {
    return (
      <section className="pain-exit" aria-labelledby="pain-exit-title">
        <div className="pain-exit__panel motion-enter">
          <p className="pain-exit__eyebrow">Reading paused</p>
          <h2 id="pain-exit-title">That&rsquo;s information too.</h2>
          <p className="pain-exit__copy">
            Your arms didn&rsquo;t reach the overhead line this time. That&rsquo;s worth knowing —
            no reading is saved, and it&rsquo;s noted in your logbook. Try again another day, only
            as high as feels comfortable.
          </p>

          {sendJoint && (
            <SendTheMeter
              joint={sendJoint}
              contextId={context?.id}
              giftLine={context?.giftLine}
              lead="Maybe it helps someone you know."
              surface="pain-exit"
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
