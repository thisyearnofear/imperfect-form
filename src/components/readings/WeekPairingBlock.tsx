'use client';

import type { WeekPairing } from '@/lib/movementCompare';
import type { NiggleContextDef, NiggleJoint } from '@/lib/niggleIntents';
import WeekHandoff from '@/components/readings/WeekHandoff';

type WeekPairingBlockProps = {
  pairing: WeekPairing;
  joint?: NiggleJoint | null;
  context?: NiggleContextDef | null;
  userAddress?: string;
};

/**
 * "· The week ·" — numbers vs feelings in one honest line inside the
 * verdict card. Only the 'still-hurts' state earns the handoff door —
 * when the pairing says "worth seeing a professional", the week goes with
 * them (four-moment medical handoff §4). The other two states stay a
 * sentence; a copy door next to good news would read as escalation.
 */
export function WeekPairingBlock({ pairing, joint, context, userAddress }: WeekPairingBlockProps) {
  return (
    <div className="session-recap__week">
      <p className="session-recap__week-eyebrow">· The week ·</p>
      <p className="session-recap__week-headline">{pairing.headline}</p>
      <p className="session-recap__week-detail">{pairing.detail}</p>
      {pairing.state === 'still-hurts' && (
        <p className="session-recap__week-handoff">
          <WeekHandoff
            joint={joint}
            context={context}
            userAddress={userAddress}
            label="take your week with you — copy the summary"
          />
        </p>
      )}
    </div>
  );
}

export default WeekPairingBlock;
