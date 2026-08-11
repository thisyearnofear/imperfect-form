import { describe, expect, it } from 'vitest';
import { movementShareMetadata } from '@/lib/challengeAnalytics';

describe('movementShareMetadata', () => {
  it('a reply continues the incoming thread with the same challengeId', () => {
    expect(
      movementShareMetadata({
        mode: 'curls',
        protocolId: 'curls-baseline',
        challengeId: 'incoming-card-7',
      })
    ).toEqual({
      mode: 'curls',
      protocolId: 'curls-baseline',
      source: 'session-recap',
      challengeId: 'incoming-card-7',
    });
  });

  it('a fresh share uses the new card challengeId and forwards replyToChallengeId when present', () => {
    expect(
      movementShareMetadata({
        mode: 'curls',
        protocolId: 'curls-baseline',
        challengeId: 'new-card-9',
        replyToChallengeId: 'incoming-card-7',
      })
    ).toEqual({
      mode: 'curls',
      protocolId: 'curls-baseline',
      source: 'session-recap',
      challengeId: 'new-card-9',
      replyToChallengeId: 'incoming-card-7',
    });
  });

  it('omits replyToChallengeId when the payload does not continue a thread', () => {
    expect(
      movementShareMetadata({ mode: 'curls', protocolId: 'curls-baseline', challengeId: 'card-1' })
    ).not.toHaveProperty('replyToChallengeId');
  });

  it('emits only known aggregate keys — raw fields cannot leak', () => {
    const metadata = movementShareMetadata({
      mode: 'curls',
      protocolId: 'curls-baseline',
      challengeId: 'card-1',
    });
    expect(Object.keys(metadata).sort()).toEqual(['challengeId', 'mode', 'protocolId', 'source']);
  });
});
