'use client';

import React, { useEffect, useState } from 'react';
import { PersonStanding } from 'lucide-react';
import { useNiggle } from '@/hooks/useNiggle';
import { getNiggleJoint, type NiggleJointId } from '@/lib/niggleIntents';
import { addNiggleEntry, isFeelEntry, listNiggleEntries } from '@/lib/niggleEntries';
import { morselForToday, stretchForEaseMove } from '@/lib/jointWisdom';
import MorselCard from '@/components/receive/MorselCard';
import StretchSequence from '@/components/recovery/StretchSequence';
import '@/styles/morsel.css';

/**
 * The Today block — the readings tab's daily beat between the weekly
 * countdown and the history (retention arc §1). Three quiet offers in
 * order: (a) "how's it feel today?" — the same 1–5 feel chips the recap's
 * post-ease check-in writes with; (b) "two minutes for the trap" — the
 * niggle's ease sequence; (c) today's morsel — one engraved fact. A count
 * of check-ins, never a streak; wellness, never medicine.
 */

/** Joint-aware phrase for the ease door — the trap for neck & shoulders,
 *  the plain name elsewhere (same idiom as the recap's send phrases). */
const EASE_PHRASE: Record<NiggleJointId, string> = {
  'neck-shoulders': 'the trap',
  back: 'the lower back',
  knee: 'the knee',
  arm: 'the arm',
  'not-sure': 'the niggle',
};

const DAY_MS = 86_400_000;

/** Feel check-ins for this joint inside the last `days` days. */
function feelCheckIns(jointId: NiggleJointId, days: number, now = Date.now()): number {
  return listNiggleEntries().filter(
    (entry) =>
      isFeelEntry(entry) && entry.joint === jointId && entry.timestamp >= now - days * DAY_MS
  ).length;
}

export function TodayBlock() {
  const { joint, context, hydrated } = useNiggle();
  const [noted, setNoted] = useState(false);
  const [weekCount, setWeekCount] = useState(0);
  const [easeTarget, setEaseTarget] = useState<{ mode: string; startIndex: number } | null>(null);

  const resolved = joint ?? getNiggleJoint('neck-shoulders');
  const jointId = resolved?.id ?? 'neck-shoulders';

  // Once hydrated (or the joint changes): has today already been noted?
  // A same-day feel entry latches the quiet count — one check-in per day,
  // not a meter you can spam.
  useEffect(() => {
    if (!hydrated) return;
    const now = Date.now();
    setWeekCount(feelCheckIns(jointId, 7, now));
    setNoted(feelCheckIns(jointId, 1, now) > 0);
  }, [hydrated, jointId]);

  if (!hydrated || !resolved) return null;

  const morsel = morselForToday(jointId);

  const noteFeel = (severity: number) => {
    addNiggleEntry({
      joint: jointId,
      context: context?.label,
      severity,
      note: 'How it felt today',
    });
    setWeekCount(feelCheckIns(jointId, 7));
    setNoted(true);
  };

  const openEase = (mode: string, startIndex = 0) => setEaseTarget({ mode, startIndex });

  return (
    <section className="today motion-enter motion-delay-1" aria-label="Today">
      <p className="today__eyebrow">· Today ·</p>

      {/* (a) how it feels — subjective context, never a measurement. */}
      <div>
        <p className="today__prompt">how&rsquo;s it feel today?</p>
        {noted ? (
          <p className="today__noted" role="status">
            noted · {weekCount} check-in{weekCount === 1 ? '' : 's'} this week
          </p>
        ) : (
          <>
            <div className="today__chips" role="group" aria-label="How does it feel today?">
              {[1, 2, 3, 4, 5].map((severity) => (
                <button
                  key={severity}
                  type="button"
                  className="today__chip"
                  onClick={() => noteFeel(severity)}
                >
                  {severity}
                </button>
              ))}
            </div>
            <div className="today__scale">
              <span>barely there</span>
              <span>a lot</span>
            </div>
          </>
        )}
      </div>

      {/* (b) two minutes of ease — the niggle's own sequence. */}
      {easeTarget ? (
        <StretchSequence
          mode={easeTarget.mode}
          startIndex={easeTarget.startIndex}
          tone="dark"
          onComplete={() => setEaseTarget(null)}
        />
      ) : (
        <button type="button" className="today__ease-door" onClick={() => openEase(resolved.mode)}>
          <PersonStanding size={12} aria-hidden="true" />
          two minutes for {EASE_PHRASE[resolved.id]}
        </button>
      )}

      {/* (c) today's morsel — one engraved fact, the deck rotating daily. */}
      <MorselCard
        morsel={morsel}
        onEase={(easeMoveId) => {
          const target = stretchForEaseMove(easeMoveId);
          if (target) openEase(target.mode, target.index);
        }}
      />
    </section>
  );
}

export default TodayBlock;
