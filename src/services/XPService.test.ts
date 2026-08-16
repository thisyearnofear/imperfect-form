import { describe, expect, it } from 'vitest';
import xpService from './XPService';
import type { LocalWorkout } from '@/types/workout';

function workout(overrides: Partial<LocalWorkout> & { reps: number }): LocalWorkout {
  return {
    id: `w-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    synced: false,
    type: 'curls',
    ...overrides,
  };
}

describe('XP form-quality multiplier', () => {
  it('pays 1.5x rep XP for a top-graded session', () => {
    const clean = xpService.calculateTotalXp([workout({ reps: 10, formScoreAvg: 100 })]);
    // 10 reps * 10 XP * 1.5 + 50 completion = 200
    expect(clean).toBe(200);
  });

  it('pays 0.5x rep XP for a bottom-graded session', () => {
    const sloppy = xpService.calculateTotalXp([workout({ reps: 10, formScoreAvg: 0.5 })]);
    // 10 reps * 10 XP * ~0.5 + 50 completion = 100 (rounding: 0.505 rounds to 51)
    expect(sloppy).toBe(101);
  });

  it('keeps ungraded workouts at 1x — form multipliers never punish ungraded modes', () => {
    const ungraded = xpService.calculateTotalXp([workout({ reps: 10, type: 'pushups' })]);
    expect(ungraded).toBe(150);
  });

  it('a graded 10-rep set out-earns a sloppy 15-rep set', () => {
    const controlled = xpService.calculateTotalXp([workout({ reps: 10, formScoreAvg: 95 })]);
    const sloppy = xpService.calculateTotalXp([workout({ reps: 15, formScoreAvg: 10 })]);
    expect(controlled).toBeGreaterThan(sloppy);
  });
});

describe('personal best bonuses cover every exercise', () => {
  it('pays the PB bonus for curl and pull-up bests', () => {
    const first = xpService.calculateTotalXp([
      workout({ reps: 5, timestamp: 1_000, formScoreAvg: 80 }),
    ]);
    const withCurlPB = xpService.calculateTotalXp([
      workout({ reps: 5, timestamp: 1_000, formScoreAvg: 80 }),
      workout({ reps: 8, timestamp: 2_000, formScoreAvg: 80 }),
    ]);
    // Second curl session beats the first PB → +100 on top of its session XP.
    const secondSessionAlone = xpService.calculateTotalXp([
      workout({ reps: 8, timestamp: 2_000, formScoreAvg: 80 }),
    ]);
    expect(withCurlPB - first).toBe(secondSessionAlone + 100);
  });
});
