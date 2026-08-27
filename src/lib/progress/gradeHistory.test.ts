import { describe, expect, it } from 'vitest';
import { buildGradeSeries } from '@/lib/progress/gradeHistory';
import type { LocalWorkout } from '@/types/workout';

function workout(partial: Partial<LocalWorkout> & { id: string; timestamp: number }): LocalWorkout {
  return {
    reps: 10,
    synced: false,
    type: 'curls',
    ...partial,
  };
}

describe('buildGradeSeries', () => {
  it('returns hasArc false for fewer than 2 graded sessions', () => {
    const series = buildGradeSeries(
      [workout({ id: 'a', timestamp: 1000, formScoreAvg: 72 })],
      'curls'
    );
    expect(series.hasArc).toBe(false);
    expect(series.points).toHaveLength(1);
    expect(series.latest?.grade).toBe('C');
  });

  it('skips sessions without a finite formScoreAvg', () => {
    const series = buildGradeSeries(
      [
        workout({ id: 'a', timestamp: 1000, formScoreAvg: 55 }),
        workout({ id: 'b', timestamp: 2000 }),
        workout({ id: 'c', timestamp: 3000, formScoreAvg: Number.NaN }),
        workout({ id: 'd', timestamp: 4000, formScoreAvg: 85 }),
      ],
      'curls'
    );
    expect(series.points).toHaveLength(2);
    expect(series.hasArc).toBe(true);
    expect(series.first?.grade).toBe('F');
    expect(series.latest?.grade).toBe('B');
  });

  it('filters to the requested mode and orders oldest to newest', () => {
    const series = buildGradeSeries(
      [
        workout({ id: 'a', timestamp: 1000, formScoreAvg: 60 }),
        workout({ id: 'b', timestamp: 2000, type: 'pushups', formScoreAvg: 90 }),
        workout({ id: 'c', timestamp: 3000, formScoreAvg: 95 }),
      ],
      'curls'
    );
    expect(series.points).toHaveLength(2);
    expect(series.points[0].t).toBeLessThan(series.points[1].t);
    expect(series.points[1].score).toBe(95);
  });

  it('caps at limit keeping the newest sessions', () => {
    const workouts = Array.from({ length: 12 }, (_, i) =>
      workout({ id: String(i), timestamp: (i + 1) * 1000, formScoreAvg: 50 + i })
    );
    const series = buildGradeSeries(workouts, 'curls', 8);
    expect(series.points).toHaveLength(8);
    expect(series.points[0].score).toBe(54);
    expect(series.latest?.score).toBe(61);
  });
});
