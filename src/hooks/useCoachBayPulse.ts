'use client';

import { useEffect } from 'react';
import { coachStation } from '@/services/coachStation';

export type CoachBayPulseKind = 'cue' | 'demo' | null;

/**
 * Mirrors coach-station form cues / demonstrations onto body[data-coach-pulse]
 * so StudioAtmosphere (and fallback overlay) can pulse without prop drilling.
 */
export function useCoachBayPulse(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // No station connected — skip subscribing to the coachStation event bus
    // and setting up pulse timers on day-0 when the arm is never linked
    // (PERFORMANT).
    if (!coachStation.enabled) return;

    let clearTimer = 0;

    const pulse = (kind: Exclude<CoachBayPulseKind, null>, ms: number) => {
      document.body.setAttribute('data-coach-pulse', kind);
      window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => {
        if (document.body.getAttribute('data-coach-pulse') === kind) {
          document.body.removeAttribute('data-coach-pulse');
        }
      }, ms);
    };

    const unsubDemo = coachStation.onDemonstration((event) => {
      pulse('demo', Math.max(2200, Math.min(8000, event.duration_s * 1000 || 3200)));
    });

    const unsubCue = coachStation.onFormCue(() => {
      // Lighter tip — don't stomp an active demo pulse
      if (document.body.getAttribute('data-coach-pulse') === 'demo') return;
      pulse('cue', 1400);
    });

    return () => {
      unsubDemo();
      unsubCue();
      window.clearTimeout(clearTimer);
      document.body.removeAttribute('data-coach-pulse');
    };
  }, []);
}
