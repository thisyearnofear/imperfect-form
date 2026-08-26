import { describe, expect, it } from 'vitest';
import {
  clearIssueHabituation,
  createCueHabituationState,
  decideCueDelivery,
} from './cueHabituation';

describe('cueHabituation', () => {
  it('voices the full phrase on the first occurrence', () => {
    const result = decideCueDelivery(
      'elbow_swing',
      'Pin your elbows.',
      createCueHabituationState()
    );
    expect(result.voice).toBe(true);
    expect(result.tier).toBe('full');
    expect(result.phrase).toBe('Pin your elbows.');
  });

  it('voices the short phrase on the second occurrence when provided', () => {
    let state = createCueHabituationState();
    state = decideCueDelivery('elbow_swing', 'Pin your elbows.', state).state;
    const result = decideCueDelivery('elbow_swing', 'Pin your elbows.', state, 'Elbows in.');
    expect(result.voice).toBe(true);
    expect(result.tier).toBe('short');
    expect(result.phrase).toBe('Elbows in.');
  });

  it('falls back to the full phrase when no short phrase exists', () => {
    let state = createCueHabituationState();
    state = decideCueDelivery('depth', 'Go deeper.', state).state;
    const result = decideCueDelivery('depth', 'Go deeper.', state);
    expect(result.voice).toBe(true);
    expect(result.phrase).toBe('Go deeper.');
  });

  it('goes silent from the third occurrence onward', () => {
    let state = createCueHabituationState();
    for (let i = 0; i < 2; i++) {
      state = decideCueDelivery('elbow_swing', 'Pin your elbows.', state).state;
    }
    const third = decideCueDelivery('elbow_swing', 'Pin your elbows.', state);
    expect(third.voice).toBe(false);
    expect(third.tier).toBe('silent');

    const fourth = decideCueDelivery('elbow_swing', 'Pin your elbows.', third.state);
    expect(fourth.voice).toBe(false);
    expect(fourth.tier).toBe('silent');
  });

  it('tracks issues independently', () => {
    let state = createCueHabituationState();
    state = decideCueDelivery('elbow_swing', 'Pin your elbows.', state).state;
    const other = decideCueDelivery('depth', 'Go deeper.', state);
    expect(other.voice).toBe(true);
    expect(other.tier).toBe('full');
  });

  it('clearing an issue resets it to a fresh first occurrence', () => {
    let state = createCueHabituationState();
    for (let i = 0; i < 3; i++) {
      state = decideCueDelivery('elbow_swing', 'Pin your elbows.', state).state;
    }
    state = clearIssueHabituation('elbow_swing', state);
    const result = decideCueDelivery('elbow_swing', 'Pin your elbows.', state);
    expect(result.voice).toBe(true);
    expect(result.tier).toBe('full');
  });

  it('clearing an unknown issue is a no-op', () => {
    const state = createCueHabituationState();
    expect(clearIssueHabituation('nope', state)).toBe(state);
  });
});
