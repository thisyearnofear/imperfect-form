import { describe, expect, it } from 'vitest';
import { buildEngagementAnalytics, mapFunnelCounts, scalarCount } from './analyticsQuery';

describe('scalarCount', () => {
  it('reads the first cell of the first row', () => {
    expect(scalarCount([[42]])).toBe(42);
    expect(scalarCount([['7']])).toBe(0); // non-numeric stays honest
  });

  it('is 0 on empty results', () => {
    expect(scalarCount([])).toBe(0);
  });
});

describe('mapFunnelCounts', () => {
  it('maps GROUP BY rows into the funnel shape and ignores unknown events', () => {
    const funnel = mapFunnelCounts([
      ['assessment_card_shared', 10],
      ['assessment_started', 6],
      ['assessment_replied', 2],
      ['something_else', 99],
    ]);
    expect(funnel.assessment_card_shared).toBe(10);
    expect(funnel.assessment_challenge_opened).toBe(0);
    expect(funnel.assessment_started).toBe(6);
    expect(funnel.assessment_replied).toBe(2);
  });

  it('starts every stage at zero', () => {
    const funnel = mapFunnelCounts([]);
    expect(Object.values(funnel).every((v) => v === 0)).toBe(true);
    expect(Object.keys(funnel)).toHaveLength(5);
  });
});

describe('buildEngagementAnalytics', () => {
  const base = {
    totalUsers: 10,
    daily: 4,
    weekly: 6,
    monthly: 8,
    sessionEvents: 30,
    workoutEvents: 20,
    usersWithWorkouts: 5,
    notificationEnabledUsers: 2,
    miniAppAddedUsers: 3,
    miniAppRemovedUsers: 1,
    funnel: mapFunnelCounts([]),
    retention: [
      { denom: 10, numer: 4 },
      { denom: 5, numer: 1 },
      { denom: 0, numer: 0 },
    ],
  };

  it('derives rates from real counts', () => {
    const a = buildEngagementAnalytics(base);
    expect(a.totalUsers).toBe(10);
    expect(a.engagement.averageSessionsPerUser).toBeCloseTo(3);
    expect(a.engagement.averageWorkoutsPerUser).toBeCloseTo(2);
    expect(a.engagement.conversionRate).toBeCloseTo(0.5);
    expect(a.retention.day1).toBeCloseTo(0.4);
    expect(a.retention.day7).toBeCloseTo(0.2);
    expect(a.notifications.enabledUsers).toBe(2);
    expect(a.notifications.disabledUsers).toBe(8);
    expect(a.miniApp.addedUsers).toBe(3);
    expect(a.miniApp.removedUsers).toBe(1);
  });

  it('reports 0 retention when the cohort is empty instead of dividing by zero', () => {
    const a = buildEngagementAnalytics({
      ...base,
      retention: [
        { denom: 0, numer: 0 },
        { denom: 0, numer: 0 },
        { denom: 0, numer: 0 },
      ],
    });
    expect(a.retention.day1).toBe(0);
    expect(a.retention.day30).toBe(0);
  });

  it('never divides by zero with zero users', () => {
    const a = buildEngagementAnalytics({ ...base, totalUsers: 0 });
    expect(a.engagement.conversionRate).toBe(0);
    expect(a.notifications.enablementRate).toBe(0);
    expect(a.miniApp.additionRate).toBe(0);
  });

  it('leaves topChains empty — the privacy allowlist drops chain names at write time', () => {
    const a = buildEngagementAnalytics(base);
    expect(a.topChains).toEqual([]);
  });
});
