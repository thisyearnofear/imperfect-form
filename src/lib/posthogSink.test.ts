import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const capture = vi.fn();
  const flush = vi.fn(async () => undefined);
  const shutdown = vi.fn();
  const constructorCalls = { count: 0 };
  class PostHogMockClass {
    capture = capture;
    flush = flush;
    shutdown = shutdown;
    constructor(_apiKey: string, _options?: unknown) {
      constructorCalls.count += 1;
    }
  }
  return {
    capture,
    flush,
    shutdown,
    PostHog: PostHogMockClass,
    constructorCalls,
  };
});

vi.mock('posthog-node', () => ({
  PostHog: mocks.PostHog,
}));

import {
  durableEventProperties,
  flushDurableEvents,
  isDurableAnalyticsEnabled,
  resetDurableAnalyticsClient,
  trackDurableEvent,
} from '@/lib/posthogSink';

describe('posthog durable analytics sink', () => {
  const originalApiKey = process.env.POSTHOG_API_KEY;
  const originalDisabled = process.env.POSTHOG_DISABLED;

  beforeEach(() => {
    // mockReset (not mockClear): also drops any mockImplementation left by a
    // previous test, so test order can never leak a throwing capture.
    mocks.capture.mockReset();
    mocks.flush.mockClear();
    mocks.shutdown.mockClear();
    mocks.constructorCalls.count = 0;
    // Isolated env per test: the key and disabled flag are configured explicitly.
    delete process.env.POSTHOG_API_KEY;
    delete process.env.POSTHOG_DISABLED;
    resetDurableAnalyticsClient();
  });

  afterEach(() => {
    resetDurableAnalyticsClient();
    if (originalApiKey === undefined) delete process.env.POSTHOG_API_KEY;
    else process.env.POSTHOG_API_KEY = originalApiKey;
    if (originalDisabled === undefined) delete process.env.POSTHOG_DISABLED;
    else process.env.POSTHOG_DISABLED = originalDisabled;
  });

  it('is disabled without an API key and never constructs a client', async () => {
    delete process.env.POSTHOG_API_KEY;
    resetDurableAnalyticsClient();

    expect(isDurableAnalyticsEnabled()).toBe(false);
    await trackDurableEvent({
      distinctId: 'anon-1',
      eventType: 'assessment_started',
      properties: {},
    });
    await flushDurableEvents();

    expect(mocks.constructorCalls.count).toBe(0);
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it('captures aggregate events when configured', async () => {
    process.env.POSTHOG_API_KEY = 'phc_test_key';
    delete process.env.POSTHOG_DISABLED;
    resetDurableAnalyticsClient();

    expect(mocks.constructorCalls.count).toBe(0);
    expect(isDurableAnalyticsEnabled()).toBe(true);
    await trackDurableEvent({
      distinctId: 'anon-abc',
      eventType: 'assessment_started',
      properties: { mode: 'curls', protocolId: 'curls-baseline', source: 'challenge-route' },
    });
    await flushDurableEvents();

    expect(mocks.constructorCalls.count).toBe(1);
    expect(mocks.capture).toHaveBeenCalledTimes(1);
    expect(mocks.capture).toHaveBeenCalledWith({
      distinctId: 'anon-abc',
      event: 'assessment_started',
      properties: expect.objectContaining({
        mode: 'curls',
        protocolId: 'curls-baseline',
        source: 'challenge-route',
        privacy: 'aggregate-only',
      }),
    });
    expect(mocks.flush).toHaveBeenCalledTimes(1);
  });

  it('never throws when the capture path fails', async () => {
    process.env.POSTHOG_API_KEY = 'phc_test_key';
    resetDurableAnalyticsClient();
    mocks.capture.mockImplementation(() => {
      throw new Error('posthog down');
    });

    await expect(
      trackDurableEvent({ distinctId: 'anon-1', eventType: 'assessment_completed', properties: {} })
    ).resolves.toBeUndefined();
  });

  it('respects the disabled flag without constructing a client', async () => {
    process.env.POSTHOG_API_KEY = 'phc_test_key';
    process.env.POSTHOG_DISABLED = 'true';
    resetDurableAnalyticsClient();

    expect(isDurableAnalyticsEnabled()).toBe(false);
    await trackDurableEvent({
      distinctId: 'anon-1',
      eventType: 'assessment_started',
      properties: {},
    });
    await flushDurableEvents();

    expect(mocks.constructorCalls.count).toBe(0);
    expect(mocks.capture).not.toHaveBeenCalled();
  });
});

describe('durableEventProperties allowlist', () => {
  it('forwards only aggregate journey fields and drops raw payloads', () => {
    expect(
      durableEventProperties({
        mode: 'curls',
        protocolId: 'curls-baseline',
        challengeType: 'movement-assessment',
        challengeId: 'card-123',
        replyToChallengeId: 'card-122',
        status: 'valid',
        confidence: 'clear',
        source: 'challenge-page',
        // Hostile or raw keys must never reach the durable sink.
        trace: [{ x: 1, y: 2 }],
        frames: 'base64-frame',
        walletAddress: '0xdeadbeef',
        fid: 12345,
        headline: 'free text that is not allowlisted',
      })
    ).toEqual({
      source: 'challenge-page',
      mode: 'curls',
      protocolId: 'curls-baseline',
      challengeType: 'movement-assessment',
      challengeId: 'card-123',
      replyToChallengeId: 'card-122',
      status: 'valid',
      confidence: 'clear',
    });
  });

  it('defaults source to unknown and missing fields to null', () => {
    expect(durableEventProperties({})).toEqual({
      source: 'unknown',
      mode: null,
      protocolId: null,
      challengeType: null,
      challengeId: null,
      replyToChallengeId: null,
      status: null,
      confidence: null,
    });
  });

  it('keeps baseline and incoming-challenge journeys distinguishable', () => {
    expect(
      durableEventProperties({
        source: 'incoming-challenge',
        mode: 'curls',
        protocolId: 'curls-baseline',
        challengeId: 'card-9',
      })
    ).toMatchObject({
      source: 'incoming-challenge',
      challengeId: 'card-9',
    });
    expect(
      durableEventProperties({ source: 'baseline', mode: 'curls', protocolId: 'curls-baseline' })
    ).toMatchObject({
      source: 'baseline',
      challengeId: null,
    });
  });
});
