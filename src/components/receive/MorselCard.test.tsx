import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { JOINT_MORSELS } from '@/lib/jointWisdom';

// MorselCard → usePlatform; the card is copy + doors, so the platform
// context is stubbed to a guest (same pattern as PainExit.test).
vi.mock('@/contexts/PlatformContext', () => ({
  usePlatform: () => ({ user: null }),
}));
// Vitest's vite pipeline cannot load the repo's Next PostCSS config;
// the stylesheet is irrelevant to DOM-structure assertions anyway.
vi.mock('@/styles/morsel.css', () => ({}));

import { MorselCard } from './MorselCard';

const morsel = JOINT_MORSELS[0];

/**
 * The morsel card is a sendable plate: beside the ease door it carries the
 * quiet send door — one underlined line, never a form. The morsel's own
 * line is the caring message, so there is no note field on the card.
 */
describe('MorselCard', () => {
  it('renders the send door under the morsel line', () => {
    const markup = renderToStaticMarkup(<MorselCard morsel={morsel} />);
    expect(markup).toContain('morsel__send');
    expect(markup).toContain('someone you know would want this');
    // The line sits above the door — the fact is what gets sent.
    expect(markup.indexOf(morsel.line)).toBeLessThan(markup.indexOf('morsel__send'));
  });

  it('keeps the card input-free — the morsel itself is the note', () => {
    const markup = renderToStaticMarkup(<MorselCard morsel={morsel} />);
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('<textarea');
  });

  it('still offers the ease door when the morsel names a move', () => {
    const withEase = JOINT_MORSELS.find((m) => m.easeMoveId)!;
    const markup = renderToStaticMarkup(<MorselCard morsel={withEase} onEase={() => {}} />);
    expect(markup).toContain('morsel__ease');
    expect(markup).toContain('ease it');
    // …and the send door stands beside it, not instead of it.
    expect(markup).toContain('morsel__send');
  });
});
