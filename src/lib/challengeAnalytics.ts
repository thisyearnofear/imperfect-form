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

/**
 * Record a challenge milestone without blocking the coaching flow.
 *
 * Anonymous users are intentionally not assigned a synthetic identity here;
 * the existing analytics endpoint records events for Farcaster users only.
 * The shared payload contains challenge metadata, never camera frames.
 */
export function trackChallengeEvent(
  eventType: ChallengeEventType,
  fid: number | undefined,
  metadata: Record<string, unknown> = {}
): void {
  if (!fid || typeof window === 'undefined') return;

  void fetch('/api/analytics/engagement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      fid,
      eventType,
      metadata: {
        ...metadata,
        privacy: 'pose-trace-only',
      },
    }),
  }).catch(() => {
    // Analytics must never interrupt a workout or a share gesture.
  });
}
