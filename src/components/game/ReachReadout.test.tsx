import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameHUD } from './GameHUD';
import { ReachCueLine } from './ReachCueLine';

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * DOM-verification for the reach read's reliability surfaces: the live
 * elevation gauge beside the pips and the one-line explainer. Rendered to
 * static markup — the session hooks are provider-free.
 */
describe('ReachElevGauge (GameHUD, reach reading)', () => {
  it('shows the live elevation next to a marker at the 135° rep line', () => {
    const markup = renderToStaticMarkup(
      <GameHUD
        mode="reach"
        timeLeft={120}
        repCount={0}
        formatTime={fmt}
        readingTargetReps={5}
        reachElevationDeg={120}
      />
    );
    expect(markup).toContain('hud-elev');
    expect(markup).toContain('elev ~120°');
    expect(markup).toContain('role="meter"');
    expect(markup).toContain('aria-valuenow="120"');
    // The rep-line tick sits at 135/180 = 75% of the track.
    expect(markup).toContain('hud-elev__line');
    expect(markup).toContain('bottom:75%');
    expect(markup).toContain('135° line');
  });

  it('stays mounted with an honest empty read when the arm is out of frame', () => {
    const markup = renderToStaticMarkup(
      <GameHUD
        mode="reach"
        timeLeft={120}
        repCount={0}
        formatTime={fmt}
        readingTargetReps={5}
        reachElevationDeg={null}
      />
    );
    expect(markup).toContain('hud-elev');
    expect(markup).toContain('elev —');
    expect(markup).toContain('aria-valuetext="arm not in frame"');
  });

  it('does not render for non-reach modes or non-reading sessions', () => {
    const curls = renderToStaticMarkup(
      <GameHUD mode="curls" timeLeft={120} repCount={0} formatTime={fmt} readingTargetReps={5} />
    );
    expect(curls).not.toContain('hud-elev');

    const openSet = renderToStaticMarkup(
      <GameHUD mode="reach" timeLeft={120} repCount={0} formatTime={fmt} />
    );
    expect(openSet).not.toContain('hud-elev');
  });

  it('renders on the mobile pill branch too', () => {
    const markup = renderToStaticMarkup(
      <GameHUD
        mode="reach"
        timeLeft={120}
        repCount={0}
        formatTime={fmt}
        isMobile
        readingTargetReps={5}
        reachElevationDeg={88}
      />
    );
    expect(markup).toContain('hud-elev');
    expect(markup).toContain('elev ~88°');
  });
});

describe('ReachCueLine', () => {
  it('renders the cue text inside the quiet readiness pill', () => {
    const markup = renderToStaticMarkup(
      <ReachCueLine text="Close — a little higher for the line." />
    );
    expect(markup).toContain('data-reach-cue');
    expect(markup).toContain('Close — a little higher for the line.');
    expect(markup).toContain('readiness-hint');
    expect(markup).toContain('role="status"');
  });

  it('renders nothing when there is no cue', () => {
    expect(renderToStaticMarkup(<ReachCueLine text={null} />)).toBe('');
  });
});
