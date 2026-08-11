'use client';

import type { EngagementEventType } from '@/lib/engagementTracker';

type ChallengeEventType = Extract<
  EngagementEventType,
  | 'challenge_opened'
  | 'challenge_started'
  | 'challenge_completed'
  | 'challenge_replied'
  | 'challenge_shared'
>;

export type MovementChallengeEventType = Extract<
  EngagementEventType,
  | 'assessment_card_shared'
  | 'assessment_challenge_opened'
  | 'assessment_started'
  | 'assessment_completed'
  | 'assessment_replied'
>;

const ANONYMOUS_ANALYTICS_KEY = 'imf_assessment_analytics_id';

function getAnonymousAnalyticsId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const existing = window.localStorage.getItem(ANONYMOUS_ANALYTICS_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(ANONYMOUS_ANALYTICS_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

/**
 * Record a challenge milestone without blocking the coaching flow.
 * The payload contains challenge metadata only; no camera frames are sent.
 */
export function trackChallengeEvent(
  eventType: ChallengeEventType,
  fid: number | undefined,
  metadata: Record<string, unknown> = {}
): void {
  trackEvent(eventType, fid, metadata);
}

/** Movement Intelligence funnel telemetry; payloads remain aggregate-only. */
export function trackMovementChallengeEvent(
  eventType: MovementChallengeEventType,
  fid: number | undefined,
  metadata: Record<string, unknown> = {}
): void {
  trackEvent(eventType, fid, { ...metadata, challengeType: 'movement-assessment' });
}

function trackEvent(
  eventType: EngagementEventType,
  fid: number | undefined,
  metadata: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  void fetch('/api/analytics/engagement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      ...(fid ? { fid } : { anonymousId: getAnonymousAnalyticsId() }),
      eventType,
      metadata: {
        ...metadata,
        privacy: 'aggregate-only',
      },
    }),
  }).catch(() => {
    // Analytics must never interrupt a workout or a share gesture.
  });
}
