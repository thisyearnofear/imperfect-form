import { describe, expect, it } from 'vitest';
import { readingSentence } from '@/lib/readingSentence';
import type { MovementAssessmentMeasurements } from '@/types/movementAssessment';

function m(overrides: Partial<MovementAssessmentMeasurements>): MovementAssessmentMeasurements {
  return { range: 0.7, control: 0.8, symmetry: 0.9, traceStability: 0.8, ...overrides };
}

describe('readingSentence', () => {
  it('uses "steady" at control >= 0.8', () => {
    expect(readingSentence(m({ control: 0.8 }))).toContain('steady');
    expect(readingSentence(m({ control: 0.95 }))).toContain('steady');
  });

  it('uses "mostly steady" at 0.6 <= control < 0.8', () => {
    expect(readingSentence(m({ control: 0.6 }))).toContain('mostly steady');
    expect(readingSentence(m({ control: 0.79 }))).toContain('mostly steady');
  });

  it('uses "a bit wobbly" below 0.6', () => {
    expect(readingSentence(m({ control: 0.59 }))).toContain('a bit wobbly');
  });

  it('names the unmatched-sides case when symmetry is null', () => {
    expect(readingSentence(m({ symmetry: null, control: 0.8 }))).toBe(
      'Control was steady. Left and right couldn’t be compared — keep both arms in frame next time.'
    );
  });

  it('reads closely matched at symmetry >= 0.9', () => {
    expect(readingSentence(m({ symmetry: 0.9 }))).toBe(
      'Both sides moved closely matched, and control was steady.'
    );
  });

  it('reads a little different at 0.75 <= symmetry < 0.9', () => {
    expect(readingSentence(m({ symmetry: 0.75, control: 0.6 }))).toBe(
      'One side moved a little differently from the other; control was mostly steady.'
    );
  });

  it('reads noticeably different below 0.75', () => {
    expect(readingSentence(m({ symmetry: 0.74, control: 0.5 }))).toBe(
      'Left and right moved noticeably differently; control was a bit wobbly.'
    );
  });
});
