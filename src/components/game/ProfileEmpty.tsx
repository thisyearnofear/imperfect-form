'use client';

import { ArrowRight, Camera, LockKeyhole } from 'lucide-react';
import { BRAND, getIntentDef } from '@/lib/brandPositioning';
import { playStudioCue } from '@/lib/uiSound';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import '@/styles/coach-foyer.css';

type ProfileEmptyProps = {
  onTryOneRep: () => void;
};

/**
 * Empty record — same doorway as home. No scoreboard for a game
 * that has not started.
 */
export function ProfileEmpty({ onTryOneRep }: ProfileEmptyProps) {
  const foyer = getIntentDef('understand').foyer;
  const { triggerHaptic } = useHapticFeedback();

  return (
    <section className="coach-foyer" aria-labelledby="profile-empty-title">
      <div className="coach-foyer__atmosphere" aria-hidden="true">
        <div className="coach-foyer__glow" />
        <div className="coach-foyer__grid" />
      </div>

      <div className="coach-foyer__inner">
        <p className="coach-foyer__brand motion-enter motion-delay-1">{foyer.brand}</p>
        <h2 id="profile-empty-title" className="coach-foyer__title motion-enter motion-delay-2">
          {foyer.line1}
        </h2>
        <p className="coach-foyer__lede motion-enter motion-delay-2">
          Your first set writes the record.
        </p>

        <button
          type="button"
          className="coach-foyer__start coach-foyer__start--hero feel-press motion-enter"
          style={{ animationDelay: '320ms' }}
          aria-label="Try one rep with camera coaching"
          onClick={() => {
            playStudioCue('press');
            triggerHaptic([50, 100]);
            onTryOneRep();
          }}
        >
          <Camera size={18} strokeWidth={2} aria-hidden="true" />
          <span>Try one rep</span>
          <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <p
          className="coach-foyer__trust coach-foyer__trust--under-start motion-enter"
          style={{ animationDelay: '380ms' }}
        >
          <LockKeyhole size={14} strokeWidth={2} aria-hidden="true" />
          {BRAND.trustLine}
        </p>
      </div>
    </section>
  );
}

export default ProfileEmpty;
