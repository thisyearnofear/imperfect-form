import { describe, expect, it } from 'vitest';
import {
  createPersonaSuggestionState,
  decidePersonaSuggestion,
  sessionTempo,
  tempoBandFor,
} from './personaTempo';

describe('personaTempo', () => {
  describe('tempoBandFor', () => {
    it('maps slow tempos to SNEL', () => {
      expect(tempoBandFor(5.0)).toBe('SNEL');
      expect(tempoBandFor(4.0)).toBe('SNEL');
    });

    it('maps middle tempos to STEDDIE', () => {
      expect(tempoBandFor(3.0)).toBe('STEDDIE');
      expect(tempoBandFor(2.5)).toBe('STEDDIE');
    });

    it('maps fast tempos to RASTA', () => {
      expect(tempoBandFor(1.5)).toBe('RASTA');
      expect(tempoBandFor(0.8)).toBe('RASTA');
    });
  });

  describe('sessionTempo', () => {
    it('returns null when there are too few reps', () => {
      expect(sessionTempo([0, 2000, 4000])).toBeNull();
    });

    it('computes average seconds per rep', () => {
      // 4 reps at 3s intervals → 3.0 s/rep
      expect(sessionTempo([0, 3000, 6000, 9000])).toBeCloseTo(3.0);
    });

    it('ignores implausible rest gaps over 30s', () => {
      // One 60s pause should not skew the tempo; remaining gaps are 2s.
      const timestamps = [0, 2000, 4000, 64000, 66000, 68000];
      expect(sessionTempo(timestamps)).toBeCloseTo(2.0);
    });

    it('is order-independent', () => {
      expect(sessionTempo([9000, 0, 6000, 3000])).toBeCloseTo(3.0);
    });
  });

  describe('decidePersonaSuggestion', () => {
    it('does not suggest before enough sessions', () => {
      const state = createPersonaSuggestionState();
      const first = decidePersonaSuggestion('STEDDIE', 1.5, state);
      expect(first.suggest).toBeNull();
      const second = decidePersonaSuggestion('STEDDIE', 1.5, first.state);
      expect(second.suggest).toBeNull();
    });

    it('suggests the measured band after enough consistent sessions', () => {
      let state = createPersonaSuggestionState();
      for (let i = 0; i < 3; i++) {
        const result = decidePersonaSuggestion('STEDDIE', 1.5, state);
        state = result.state;
        if (i === 2) expect(result.suggest).toBe('RASTA');
      }
    });

    it('never suggests the current persona', () => {
      let state = createPersonaSuggestionState();
      let suggest: string | null = null;
      for (let i = 0; i < 4; i++) {
        const result = decidePersonaSuggestion('RASTA', 1.5, state);
        state = result.state;
        suggest = result.suggest;
      }
      expect(suggest).toBeNull();
    });

    it('never re-suggests a dismissed persona', () => {
      let state = createPersonaSuggestionState();
      state = { ...state, dismissed: ['RASTA'] };
      let suggest: string | null = null;
      for (let i = 0; i < 4; i++) {
        const result = decidePersonaSuggestion('STEDDIE', 1.5, state);
        state = result.state;
        suggest = result.suggest;
      }
      expect(suggest).toBeNull();
    });

    it('ignores null tempo sessions (too few reps)', () => {
      let state = createPersonaSuggestionState();
      for (let i = 0; i < 5; i++) {
        const result = decidePersonaSuggestion('STEDDIE', null, state);
        state = result.state;
        expect(result.suggest).toBeNull();
      }
      expect(state.samples).toHaveLength(0);
    });

    it('uses the median of recent samples, not a single outlier', () => {
      let state = createPersonaSuggestionState();
      // Two slow sessions, one fast — median stays slow.
      const tempos = [5.0, 5.2, 1.0];
      let suggest: string | null = null;
      for (const tempo of tempos) {
        const result = decidePersonaSuggestion('STEDDIE', tempo, state);
        state = result.state;
        suggest = result.suggest;
      }
      expect(suggest).toBe('SNEL');
    });
  });
});
