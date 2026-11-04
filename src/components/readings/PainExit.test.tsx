import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// PainExit → SendTheMeter → usePlatform; the exit surface itself is
// provider-free copy, so the platform context is stubbed to a guest.
vi.mock('@/contexts/PlatformContext', () => ({
  usePlatform: () => ({ user: null }),
}));
// Vitest's vite pipeline cannot load the repo's Next PostCSS config;
// the stylesheet is irrelevant to DOM-structure assertions anyway.
vi.mock('@/styles/send-the-meter.css', () => ({}));

import { PainExit } from './PainExit';

/**
 * DOM-verification for the honest-exit surfaces: a model-load failure or a
 * no-signal stall must never read as a body result ("your arms didn't reach
 * the overhead line"), and the send card renders folded on these exits.
 */
describe('PainExit honest variants', () => {
  it('stalled keeps the reach copy when the meter was tracking', () => {
    const markup = renderToStaticMarkup(<PainExit onDone={() => {}} variant="stalled" />);
    expect(markup).toContain('reach the overhead line');
    expect(markup).toContain('noted in your logbook');
  });

  it('stalled-no-signal blames the signal, never the arms', () => {
    const markup = renderToStaticMarkup(
      <PainExit onDone={() => {}} onRetry={() => {}} variant="stalled-no-signal" />
    );
    expect(markup).not.toContain('reach the overhead line');
    expect(markup).toContain('see you clearly');
    expect(markup).toContain('framing and the light');
    expect(markup).toContain('Try again');
  });

  it('meter-couldnt-wake reports a connection problem, not a body result', () => {
    const markup = renderToStaticMarkup(
      <PainExit onDone={() => {}} onRetry={() => {}} variant="meter-couldnt-wake" />
    );
    expect(markup).not.toContain('reach the overhead line');
    expect(markup).toContain('meter didn');
    expect(markup).toContain('nothing was measured');
    expect(markup).toContain('Try again');
  });

  it('folds the send card on every exit variant', () => {
    for (const variant of ['pain', 'stalled', 'stalled-no-signal', 'meter-couldnt-wake'] as const) {
      const markup = renderToStaticMarkup(<PainExit onDone={() => {}} variant={variant} />);
      expect(markup).toContain('stm--collapsed');
      expect(markup).toContain('Pass it on');
      // The input fields and reply row only exist unfolded.
      expect(markup).not.toContain('stm__input');
      expect(markup).not.toContain('stm__reply');
    }
  });
});
