/**
 * Network-aware engagement dispatch.
 *
 * Wraps the `/api/analytics/engagement` POST so constrained connections
 * (save-data / 2g) skip non-critical telemetry instead of spending bytes on
 * it. Engagement events are product telemetry, never part of the coaching
 * loop, so dropping them on a constrained link is the right trade.
 *
 * Fail-open: if the Network Information API is unavailable the event sends.
 */

import { getNetworkCapabilities } from '@/lib/networkQuality';

export interface EngagementEvent {
  fid: number;
  eventType: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget engagement event. Resolves `true` when sent, `false` when
 * skipped (constrained network) or failed. Never throws.
 */
export async function trackEngagementEvent(event: EngagementEvent): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const { allowAnalytics } = getNetworkCapabilities();
  if (!allowAnalytics) return false;

  try {
    await fetch('/api/analytics/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return true;
  } catch {
    return false;
  }
}
