import { describe, expect, it } from 'vitest';
import { shouldCelebrateFirstSignal } from '@/lib/firstSignal';

describe('first signal celebration', () => {
  it('celebrates the first new rep in an active session', () => {
    expect(shouldCelebrateFirstSignal(1, 0, true)).toBe(true);
  });

  it('ignores duplicate detector callbacks for rep one', () => {
    expect(shouldCelebrateFirstSignal(1, 1, true)).toBe(false);
  });

  it('does not celebrate a rep outside an active session', () => {
    expect(shouldCelebrateFirstSignal(1, 0, false)).toBe(false);
  });
});
