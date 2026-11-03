'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerUpLeft, Send } from 'lucide-react';
import { usePlatform } from '@/contexts/PlatformContext';
import { trackMovementChallengeEvent } from '@/lib/challengeAnalytics';
import {
  SENDER_NAME_KEY,
  SENT_BY_KEY,
  sanitizeNote,
  sanitizeSenderName,
  type NiggleJoint,
} from '@/lib/niggleIntents';
import '@/styles/send-the-meter.css';

type SendTheMeterProps = {
  /** The joint whose reading the link carries (`?niggle=<joint>:<context>`). */
  joint: NiggleJoint;
  /** Context refinement — defaults to the joint's first context, same rule as intake. */
  contextId?: string;
  /** The context's empathy line, prefilled into "a line for them" — editable. */
  giftLine?: string;
  /** One quiet line of framing above the fields, in the surface's voice. */
  lead?: string;
  /** Engraved eyebrow — defaults to the pass-it-on mark. */
  eyebrow?: string;
  /** Share/copy button label — the foyer keeps its own phrasing. */
  buttonLabel?: string;
  /** Placement name, sent with the `send_link_created` event. */
  surface?: string;
  className?: string;
};

type ShareStatus = 'idle' | 'copied' | 'shared';

/** The reply's gift line, in the receiver's voice — "how it went", not a
 *  fresh ask. The trap line names the flagship joint; every other joint
 *  gets the same sentence without the anatomy. */
function replyGiftLine(joint: NiggleJoint): string {
  return joint.id === 'neck-shoulders'
    ? 'the trap says thanks — the meter saw it move'
    : 'it says thanks — the meter saw it move';
}

/**
 * "Send the meter to a friend" — the shared send card (docs/RECEIVING_EXPERIENCE).
 * An engraved eyebrow, two compact fields ("your name" + "a line for them"),
 * the link rebuilt live as they type, and one share/copy door. The name
 * persists (SENDER_NAME_KEY) so every card greets with it prefilled; the
 * line travels as `&note=` — the gift, not the diagnosis.
 */
export function SendTheMeter({
  joint,
  contextId,
  giftLine,
  lead,
  eyebrow = '· Pass the meter on ·',
  buttonLabel = 'Send the meter to a friend',
  surface,
  className,
}: SendTheMeterProps) {
  const { user } = usePlatform();
  const [status, setStatus] = useState<ShareStatus>('idle');
  // The sender's name is remembered across cards — read it once, lazily, so
  // first paint already carries it (same discipline as the foyer's greeting).
  const [name, setName] = useState(() =>
    typeof window === 'undefined' ? '' : (localStorage.getItem(SENDER_NAME_KEY) ?? '')
  );
  const [note, setNote] = useState('');
  // "A line for them" starts as the context's gift line, but once the user
  // has written their own words a context switch must never overwrite them.
  const noteTouchedRef = useRef(false);
  useEffect(() => {
    if (!noteTouchedRef.current) setNote(giftLine ?? '');
  }, [giftLine]);

  // Reply-to-sender: a `?from=` arrival remembers who sent the meter
  // (SENT_BY_KEY), so the card can offer a way back — "Tell her how it
  // went". The reply link greets her with THIS user's name, so `&from=`
  // rides the shared name field, not hers.
  const [sentBy] = useState(() =>
    typeof window === 'undefined' ? null : localStorage.getItem(SENT_BY_KEY)
  );
  const [replyNote, setReplyNote] = useState(() => replyGiftLine(joint));
  const replyTouchedRef = useRef(false);
  useEffect(() => {
    if (!replyTouchedRef.current) setReplyNote(replyGiftLine(joint));
  }, [joint]);

  // Debounced persistence — the name is theirs, kept for the next card.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const clean = sanitizeSenderName(name);
      if (clean) localStorage.setItem(SENDER_NAME_KEY, clean);
      else localStorage.removeItem(SENDER_NAME_KEY);
    }, 450);
    return () => window.clearTimeout(t);
  }, [name]);

  const resolvedContext = contextId ?? joint.contexts[0].id;

  // The link, rebuilt on every keystroke — sanitized exactly as the foyer's
  // `&from=`/`&note=` parser expects.
  const href = useMemo(() => {
    const params = new URLSearchParams();
    params.set('niggle', `${joint.id}:${resolvedContext}`);
    const from = sanitizeSenderName(name);
    const line = sanitizeNote(note);
    if (from) params.set('from', from);
    if (line) params.set('note', line);
    return `/?${params.toString()}`;
  }, [joint.id, resolvedContext, name, note]);

  // The reply link: same niggle + context this card carries, `&from=` the
  // replier's own name, `&note=` their how-it-went line. Same sanitizers the
  // foyer's parser already trusts.
  const replyHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('niggle', `${joint.id}:${resolvedContext}`);
    const from = sanitizeSenderName(name);
    const line = sanitizeNote(replyNote);
    if (from) params.set('from', from);
    if (line) params.set('note', line);
    return `/?${params.toString()}`;
  }, [joint.id, resolvedContext, name, replyNote]);

  // One share path for both doors — the send link and the reply-to-sender
  // differ only in the URL and the surface the analytics carry.
  const share = async (link: string, shareSurface: string | undefined, noteText: string) => {
    const from = sanitizeSenderName(name);
    // On share the name is committed right away — no waiting on the debounce.
    if (from) localStorage.setItem(SENDER_NAME_KEY, from);
    const url = `${window.location.origin}${link}`;
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
        joint: joint.id,
        context: resolvedContext,
        hasNote: Boolean(sanitizeNote(noteText)),
        hasName: Boolean(from),
        ...(shareSurface ? { surface: shareSurface } : {}),
      });
      setStatus(shared ? 'shared' : 'copied');
      window.setTimeout(() => setStatus('idle'), 2500);
    } catch {
      /* share cancelled or clipboard unavailable — nothing to repair */
    }
  };

  const handleShare = () => share(href, surface, note);
  // The reply is its own funnel — `surface: 'reply'` separates a thank-you
  // link from a fresh send, whichever card it was shared from.
  const handleReply = () => share(replyHref, 'reply', replyNote);

  return (
    <div className={`stm${className ? ` ${className}` : ''}`}>
      <p className="stm__eyebrow">{eyebrow}</p>
      {lead && <p className="stm__lead">{lead}</p>}
      {/* "add your name + a line" — the values ride the shared URL as
          &from=/&note= so the receiver's greeting block can quote the
          sender's own words instead of the context's giftLine. */}
      <div className="stm__fields">
        <input
          type="text"
          className="stm__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          aria-label="Your name — added to the link"
          maxLength={24}
          autoComplete="name"
        />
        <input
          type="text"
          className="stm__input stm__input--note"
          value={note}
          onChange={(e) => {
            noteTouchedRef.current = true;
            setNote(e.target.value);
          }}
          placeholder="a line for them"
          aria-label="A line for them — added to the link"
          maxLength={140}
        />
      </div>
      {/* The link as it stands — live-built, sanitized, ready to pass on. */}
      <p className="stm__url" title={href}>
        {href}
      </p>
      <div className="stm__row">
        <button type="button" className="stm__button" onClick={() => void handleShare()}>
          <Send size={11} aria-hidden="true" />
          {buttonLabel}
        </button>
        <span className="stm__status" role="status" aria-live="polite">
          {status === 'copied' ? 'Link copied' : status === 'shared' ? 'Ready to send' : ''}
        </span>
      </div>
      {/* Reply-to-sender — only when this meter arrived as a gift. The
          name field above is shared (the reply greets her with it); the
          line back is its own, editable like "a line for them". */}
      {sentBy && (
        <div className="stm__reply">
          <input
            type="text"
            className="stm__input stm__input--note"
            value={replyNote}
            onChange={(e) => {
              replyTouchedRef.current = true;
              setReplyNote(e.target.value);
            }}
            placeholder="a line back"
            aria-label={`A line back to ${sentBy} — added to the reply link`}
            maxLength={140}
          />
          <button
            type="button"
            className="stm__button stm__button--reply"
            onClick={() => void handleReply()}
          >
            <CornerUpLeft size={11} aria-hidden="true" />
            Tell {sentBy} how it went
          </button>
        </div>
      )}
    </div>
  );
}

export default SendTheMeter;
