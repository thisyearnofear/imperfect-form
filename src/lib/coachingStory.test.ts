import { describe, expect, it } from 'vitest';
import { readableFormWarning, sessionStory } from '@/lib/coachingStory';
import type { SessionSummary } from '@/services/sessionLogger';

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    startTime: 1000,
    endTime: 2000,
    duration: 1,
    mode: 'curls',
    repCount: 3,
    avgDepth: 0.6,
    maxTrunkLean: 0,
    maxKneeValgus: 0,
    warningCount: 1,
    anomalies: [
      {
        timestamp: 500,
        metrics: {
          depth: 0.5,
          trunkLean: 0,
          kneeValgus: 0,
          ankleFlexion: 0,
          symmetry: 1,
          isStable: true,
          warnings: ['PIN ELBOWS'],
        },
        keypoints: [],
      },
    ],
    trace: [],
    ...overrides,
  };
}

describe('coaching story', () => {
  it('turns detector labels into human coaching language', () => {
    expect(readableFormWarning('PIN ELBOWS')).toBe('Keep your elbows quiet');
    expect(readableFormWarning('KNEES IN')).toBe('Knees are tracking inward');
  });

  it('makes the first useful observation the recap story', () => {
    const story = sessionStory(summary(), 'curls', 3);
    expect(story.title).toContain('one useful thing');
    expect(story.body).toContain('Keep your elbows quiet');
    expect(story.focus).toBe('Keep your elbows quiet');
  });

  it('carries the observed correction into the retry focus', () => {
    const story = sessionStory(summary(), 'curls', 3);
    expect(story.focus).toBe('Keep your elbows quiet');
  });

  it('keeps a clean baseline honest without inventing improvement', () => {
    const story = sessionStory(
      summary({ warningCount: 0, anomalies: [], mode: 'squats', repCount: 5 }),
      'squats',
      5
    );
    expect(story.title).toContain('clean baseline');
    expect(story.body).toContain('without a major form observation');
    expect(story.focus).toBe('Keep your knees tracking over your toes on the way down.');
  });
});
