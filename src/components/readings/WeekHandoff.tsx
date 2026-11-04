'use client';

import { useState } from 'react';
import { getLocalMovementAssessments } from '@/services/integrations/MovementAssessmentDataAdapter';
import { getEffectiveUserId } from '@/services/guestIdentity';
import { listNiggleEntries } from '@/lib/niggleEntries';
import { buildHandoffSummary } from '@/lib/handoffSummary';
import { useNiggle } from '@/hooks/useNiggle';
import type { NiggleContextDef, NiggleJoint } from '@/lib/niggleIntents';
import '@/styles/week-handoff.css';

type WeekHandoffProps = {
  /** Overrides the stored niggle; pass `null` explicitly for "no joint". */
  joint?: NiggleJoint | null;
  context?: NiggleContextDef | null;
  userAddress?: string;
  /** The quiet label — each surface writes its own ask. */
  label?: string;
  className?: string;
};

type HandoffStatus = 'idle' | 'working' | 'copied' | 'shared' | 'error';

/**
 * "Take this to a physio" — the week handoff door (four-moment medical
 * handoff §4). One quiet text button: gathers the week's local data
 * (IndexedDB reads + the localStorage feel log), builds the plain-text
 * summary on-device, and hands it to the share sheet or the clipboard —
 * the same share→clipboard pattern SendTheMeter uses. Nothing is rendered
 * on a server; the text itself tells the stranger what the meter is.
 */
export function WeekHandoff({
  joint,
  context,
  userAddress,
  label = 'copy a summary',
  className,
}: WeekHandoffProps) {
  const niggle = useNiggle();
  // `undefined` falls back to the stored intake; an explicit null means the
  // caller knows there is no niggle and the summary should say so.
  const resolvedJoint = joint === undefined ? niggle.joint : joint;
  const resolvedContext = context === undefined ? niggle.context : context;
  const [status, setStatus] = useState<HandoffStatus>('idle');
  // The last built text rides a data attribute so the copy is inspectable —
  // the summary is the user's own data, visible only after they asked for it.
  const [built, setBuilt] = useState<string | null>(null);

  const take = async () => {
    if (status === 'working') return;
    setStatus('working');
    try {
      const stored = await getLocalMovementAssessments(getEffectiveUserId(userAddress));
      const text = buildHandoffSummary({
        niggle: resolvedJoint
          ? { joint: resolvedJoint.label, context: resolvedContext?.label }
          : null,
        stored,
        entries: listNiggleEntries(),
      });
      setBuilt(text);
      if (navigator.share) {
        await navigator.share({ title: 'A niggle log', text });
        setStatus('shared');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setStatus('copied');
      } else {
        setStatus('error');
        return;
      }
      window.setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      setStatus(error instanceof Error && error.name === 'AbortError' ? 'idle' : 'error');
    }
  };

  return (
    <span className={`week-handoff${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="week-handoff__button"
        onClick={() => void take()}
        disabled={status === 'working'}
      >
        {status === 'working' ? 'gathering the week…' : label}
      </button>
      <span
        className="week-handoff__status"
        role="status"
        aria-live="polite"
        data-summary={built ?? undefined}
      >
        {status === 'copied' && 'copied — paste it anywhere'}
        {status === 'shared' && 'ready to send'}
        {status === 'error' && 'could not copy — nothing left this device'}
      </span>
    </span>
  );
}

export default WeekHandoff;
