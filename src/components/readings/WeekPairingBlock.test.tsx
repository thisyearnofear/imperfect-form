import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The stylesheet is irrelevant to DOM-structure assertions (same pattern as
// the PainExit test — vitest cannot load the repo's PostCSS config).
vi.mock('@/styles/week-handoff.css', () => ({}));

import { WeekPairingBlock } from './WeekPairingBlock';
import type { WeekPairing } from '@/lib/movementCompare';

function pairing(state: WeekPairing['state']): WeekPairing {
  return {
    state,
    headline: 'if it keeps hurting, worth seeing a professional',
    detail: 'range +4% vs your last read · feel avg 4.0 vs 2.5',
    rangeDelta: 0.04,
    feelDelta: 1.5,
  };
}

/**
 * The handoff hookup: the "· The week ·" pairing only opens the
 * "take your week with you" door when the pairing itself flags
 * worth-seeing-a-professional — the honest escalation, never decoration.
 */
describe('WeekPairingBlock — the handoff door', () => {
  it('offers the week summary under the still-hurts pairing', () => {
    const markup = renderToStaticMarkup(<WeekPairingBlock pairing={pairing('still-hurts')} />);
    expect(markup).toContain('worth seeing a professional');
    expect(markup).toContain('take your week with you — copy the summary');
    expect(markup).toContain('week-handoff__button');
  });

  it('stays a sentence on the good-news pairings — no copy door', () => {
    for (const state of ['felt-it-too', 'meter-first'] as const) {
      const markup = renderToStaticMarkup(<WeekPairingBlock pairing={pairing(state)} />);
      expect(markup).not.toContain('copy the summary');
      expect(markup).not.toContain('week-handoff');
    }
  });
});
