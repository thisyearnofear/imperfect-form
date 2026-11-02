'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import BodyPlate from '@/components/body/BodyPlate';
import { NIGGLE_JOINTS, type NiggleJointId } from '@/lib/niggleIntents';
import { addNiggleEntry } from '@/lib/niggleEntries';
import { useNiggle } from '@/hooks/useNiggle';

type PainExitProps = {
  /** Return path — back to the foyer, never a retry. */
  onDone: () => void;
};

/**
 * The designed pain exit (docs/PHASE_B_PLAN §B2). Stopping for pain is the
 * correct use of the meter, never a failure state — the surface says so in
 * the instrument's voice and offers to mark where it hurt. A mark lands in
 * the niggle logbook as context, not a measurement (DESIGN_EVOLUTION §F).
 */
export function PainExit({ onDone }: PainExitProps) {
  const { joint, hydrated } = useNiggle();
  const [marked, setMarked] = useState<NiggleJointId | null>(null);
  const [logged, setLogged] = useState(false);
  // Preselect the intake joint once storage hydrates — that is the niggle
  // the reading was for — but never overwrite a tap the user already made.
  const touchedRef = useRef(false);
  useEffect(() => {
    if (hydrated && !touchedRef.current) setMarked(joint?.id ?? null);
  }, [hydrated, joint]);

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

  return (
    <section className="pain-exit" aria-labelledby="pain-exit-title">
      <div className="pain-exit__panel motion-enter">
        <p className="pain-exit__eyebrow">Reading stopped</p>
        <h2 id="pain-exit-title">That&rsquo;s the right call.</h2>
        <p className="pain-exit__copy">
          A meter shouldn&rsquo;t hurt to use. Pain is a stop signal, not a rep to push through — if
          it persists or sharpens, see a professional. The meter will be here when it settles.
        </p>

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
