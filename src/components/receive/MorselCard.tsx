'use client';

import { useState } from 'react';
import { ArrowUpRight, Send } from 'lucide-react';
import { usePlatform } from '@/contexts/PlatformContext';
import { trackMovementChallengeEvent } from '@/lib/challengeAnalytics';
import { morselSharePath, stretchForEaseMove, type JointMorsel } from '@/lib/jointWisdom';
import {
  NIGGLE_KEY,
  SENDER_NAME_KEY,
  parseStoredNiggle,
  sanitizeNote,
  sanitizeSenderName,
} from '@/lib/niggleIntents';
import '@/styles/morsel.css';

type MorselCardProps = {
  morsel: JointMorsel;
  /** Door into the joint's ease sequence — called with the morsel's
   *  easeMoveId when the plate points at a stretch. */
  onEase?: (easeMoveId: string) => void;
};

type ShareStatus = 'idle' | 'copied' | 'shared';

/**
 * One engraved plate of joint wisdom — eyebrow, figure title, a single
 * honest fact, and two quiet underlined doors when they apply: "ease it"
 * into the named stretch, and "someone you know would want this" — a
 * send door that shares the morsel itself as the caring message (its line
 * rides the link as &note=, the gift quote on the receiving page). The
 * deck is finite and rotates daily; the card never scrolls, never
 * shuffles, never sells.
 */
export function MorselCard({ morsel, onEase }: MorselCardProps) {
  const { user } = usePlatform();
  const easeTarget = stretchForEaseMove(morsel.easeMoveId);
  const [status, setStatus] = useState<ShareStatus>('idle');

  // The send door builds the link at tap time: the stored niggle lends its
  // context only when it names the morsel's own joint (otherwise the joint's
  // first context, same rule as intake), and the remembered sender name
  // rides as &from= — absent, the line alone still reads as care.
  const sendMorsel = async () => {
    const stored = parseStoredNiggle(localStorage.getItem(NIGGLE_KEY));
    const from = sanitizeSenderName(localStorage.getItem(SENDER_NAME_KEY));
    const share = morselSharePath(morsel, {
      context: stored?.joint === morsel.joint ? stored.context : null,
      senderName: from,
    });
    const url = `${window.location.origin}${share.href}`;
    const shared = Boolean(navigator.share);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Take this reading', url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        return;
      }
      trackMovementChallengeEvent('send_link_created', user?.fid, {
        joint: morsel.joint,
        context: share.contextId,
        hasNote: Boolean(sanitizeNote(morsel.line)),
        hasName: Boolean(from),
        surface: 'morsel',
      });
      setStatus(shared ? 'shared' : 'copied');
      window.setTimeout(() => setStatus('idle'), 2500);
    } catch {
      /* share cancelled or clipboard unavailable — nothing to repair */
    }
  };

  return (
    <figure className="morsel">
      <p className="morsel__eyebrow">· Today&rsquo;s morsel ·</p>
      <p className="morsel__figure">{morsel.figureTitle}</p>
      <p className="morsel__line">{morsel.line}</p>
      {easeTarget && onEase && (
        <button
          type="button"
          className="morsel__ease"
          onClick={() => onEase(morsel.easeMoveId as string)}
        >
          ease it — {easeTarget.stretch.name.toLowerCase()}
          <ArrowUpRight size={11} aria-hidden="true" />
        </button>
      )}
      <button type="button" className="morsel__send" onClick={() => void sendMorsel()}>
        <Send size={11} aria-hidden="true" />
        {status === 'copied'
          ? 'link copied — pass it on'
          : status === 'shared'
            ? 'ready to send'
            : 'someone you know would want this'}
      </button>
    </figure>
  );
}

export default MorselCard;
