import { PostHog } from 'posthog-node';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;

  if (process.env.POSTHOG_DISABLED === 'true') {
    client = null;
    return client;
  }

  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) {
    client = null;
    return client;
  }

  try {
    client = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
      disabled: process.env.POSTHOG_DISABLED === 'true',
    });
  } catch {
    // Analytics must never crash a request because a sink misbehaves.
    client = null;
  }
  return client;
}

export interface DurableAnalyticsEvent {
  /** Stable privacy-safe identifier: Farcaster fid or the local anonymous id. */
  distinctId: string;
  eventType: string;
  properties: Record<string, unknown>;
}

/**
 * Allowlist of aggregate, non-identifying metadata forwarded to the durable
 * sink. Anything not listed here (traces, frames, addresses, free text) is
 * deliberately dropped at the boundary — the sink never sees raw payloads.
 */
export function durableEventProperties(metadata: Record<string, unknown>): Record<string, unknown> {
  return {
    source: metadata.source ?? 'unknown',
    mode: metadata.mode ?? null,
    protocolId: metadata.protocolId ?? null,
    challengeType: metadata.challengeType ?? null,
    challengeId: metadata.challengeId ?? null,
    replyToChallengeId: metadata.replyToChallengeId ?? null,
    status: metadata.status ?? null,
    confidence: metadata.confidence ?? null,
  };
}

/**
 * Send one aggregate event to the durable PostHog sink. This is best-effort
 * telemetry only: it never blocks, never throws, and sends no camera frames,
 * wallet addresses, or personally identifying payloads.
 */
export async function trackDurableEvent(event: DurableAnalyticsEvent): Promise<void> {
  if (process.env.POSTHOG_DISABLED === 'true') return;
  const active = getClient();
  if (!active) return;

  try {
    active.capture({
      distinctId: event.distinctId,
      event: event.eventType,
      properties: {
        ...event.properties,
        privacy: 'aggregate-only',
      },
    });
  } catch {
    // Analytics must never interrupt a workout or a share gesture.
  }
}

/** Flush queued events after a request completes; fails silently. */
export async function flushDurableEvents(): Promise<void> {
  if (process.env.POSTHOG_DISABLED === 'true') return;
  const active = getClient();
  if (!active) return;
  try {
    await active.flush();
  } catch {
    // Ignore flush failures; the in-memory tracker remains the fallback.
  }
}

/**
 * Resets the cached client; used by tests and during cold starts. Must never
 * construct a client: callers reset precisely so the next read re-evaluates
 * the environment.
 */
export function resetDurableAnalyticsClient(): void {
  if (client) {
    try {
      client.shutdown();
    } catch {
      // ignore
    }
  }
  client = undefined;
}

/** Whether the durable sink is configured and active. */
export function isDurableAnalyticsEnabled(): boolean {
  const active = getClient();
  return Boolean(active) && process.env.POSTHOG_DISABLED !== 'true';
}
