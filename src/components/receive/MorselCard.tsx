'use client';

import { ArrowUpRight } from 'lucide-react';
import { stretchForEaseMove, type JointMorsel } from '@/lib/jointWisdom';
import '@/styles/morsel.css';

type MorselCardProps = {
  morsel: JointMorsel;
  /** Door into the joint's ease sequence — called with the morsel's
   *  easeMoveId when the plate points at a stretch. */
  onEase?: (easeMoveId: string) => void;
};

/**
 * One engraved plate of joint wisdom — eyebrow, figure title, a single
 * honest fact, and (when the morsel names a move) a quiet "ease it" door
 * into that stretch. The deck is finite and rotates daily; the card never
 * scrolls, never shuffles, never sells.
 */
export function MorselCard({ morsel, onEase }: MorselCardProps) {
  const easeTarget = stretchForEaseMove(morsel.easeMoveId);
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
    </figure>
  );
}

export default MorselCard;
