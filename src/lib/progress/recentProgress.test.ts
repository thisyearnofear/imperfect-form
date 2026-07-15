import { describe, expect, it } from 'vitest';
import { buildProgressSeries } from '@/lib/progress/recentProgress';
import type { LocalWorkout } from '@/types/workout';

function workout(partial: Partial<LocalWorkout> & { id: string; timestamp: number }): LocalWorkout {
  return {
    reps: 10,
    synced: false,
    type: 'pushups',
    ...partial,
  };
}

describe('buildProgressSeries', () => {
  it('returns hasTrend false for fewer than 2 sessions', () => {
    const series = buildProgressSeries([workout({ id: 'a', timestamp: 1000, reps: 5 })]);
    expect(series.hasTrend).toBe(false);
    expect(series.points).toHaveLength(1);
  });

  it('orders oldest to newest and caps at limit', () => {
    const workouts = Array.from({ length: 10 }, (_, i) =>
      workout({ id: String(i), timestamp: (i + 1) * 1000, reps: i + 1 })
    );
    const series = buildProgressSeries(workouts, 7);
    expect(series.points).toHaveLength(7);
    expect(series.hasTrend).toBe(true);
    expect(series.points[0].t).toBeLessThan(series.points[6].t);
    expect(series.points[6].reps).toBe(10);
  });
});
