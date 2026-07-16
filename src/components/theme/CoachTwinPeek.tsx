'use client';

import React, { useEffect, useState } from 'react';
import {
  coachStation,
  type StationDemonstrationEvent,
  type StationStatus,
} from '@/services/coachStation';
import '@/styles/coach-twin-peek.css';

/**
 * Live twin peek — visible only when NEXT_PUBLIC_COACH_STATION is set.
 * Fail-silent: offline is a quiet status, never an error. During station
 * `demonstration` events, the silhouette curls so physical AI is felt in-UI
 * (no MuJoCo embed — Cyberwave/console stay on the station machine).
 */
export function CoachTwinPeek({ showFallbackPulse = false }: { showFallbackPulse?: boolean }) {
  const enabled = coachStation.enabled;
  const [status, setStatus] = useState<StationStatus>(coachStation.status);
  const [demo, setDemo] = useState<StationDemonstrationEvent | null>(null);

  useEffect(() => {
    if (!enabled) return;

    coachStation.connect();
    let demoTimeout = 0;

    const unsubStatus = coachStation.onStatus(setStatus);
    const unsubDemo = coachStation.onDemonstration((event) => {
      setDemo(event);
      window.clearTimeout(demoTimeout);
      demoTimeout = window.setTimeout(
        () => setDemo(null),
        Math.max(2500, event.duration_s * 1000 || 3200)
      );
    });

    return () => {
      unsubStatus();
      unsubDemo();
      window.clearTimeout(demoTimeout);
    };
  }, [enabled]);

  if (!enabled) {
    return showFallbackPulse ? (
      <div className="coach-bay-pulse-fallback" aria-hidden="true" />
    ) : null;
  }

  const statusLabel =
    demo != null
      ? 'Demonstrating'
      : status === 'connected'
        ? 'Twin linked'
        : status === 'connecting'
          ? 'Linking twin…'
          : 'Station offline';

  return (
    <>
      <div
        className={`coach-twin-peek is-visible${demo ? ' is-demo' : ''}`}
        role="status"
        aria-live="polite"
        aria-label={demo ? `Coach demonstrating: ${demo.narration}` : statusLabel}
      >
        <div className="coach-twin-peek__stage" aria-hidden="true">
          <svg className="coach-twin-peek__arm" viewBox="0 0 52 52" fill="none">
            <circle cx="18" cy="38" r="5" stroke="currentColor" strokeWidth="2" opacity="0.55" />
            <path
              d="M18 33 V16"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.85"
            />
            <g className="coach-twin-peek__forearm">
              <path d="M18 28 H38" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="38" cy="28" r="3.2" fill="currentColor" opacity="0.9" />
            </g>
            <circle cx="18" cy="28" r="3.5" fill="currentColor" />
          </svg>
        </div>
        <div className="coach-twin-peek__copy">
          <p className="coach-twin-peek__label">SO-101 twin</p>
          <p
            className={`coach-twin-peek__status${status === 'offline' && !demo ? ' is-offline' : ''}`}
          >
            {statusLabel}
          </p>
          {demo ? <p className="coach-twin-peek__tip">{demo.narration}</p> : null}
        </div>
      </div>
      {showFallbackPulse ? <div className="coach-bay-pulse-fallback" aria-hidden="true" /> : null}
    </>
  );
}

export default CoachTwinPeek;
