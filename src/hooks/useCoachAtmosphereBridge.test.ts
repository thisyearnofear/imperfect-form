import { describe, expect, it } from 'vitest';
import { qualityBandFor, type CoachQualityBand } from './useCoachAtmosphereBridge';

/**
 * The athlete-reactive bridge.
 *
 * It writes onto <body> because the atmosphere backdrop is a fixed layer
 * mounted in page.tsx — a different subtree from the session HUD that produces
 * these numbers. Same convention as the existing data-coach-pulse attributes.
 *
 * The suite runs in `node` (see vitest.config.ts) and jsdom is not a
 * dependency, so this file covers what can be checked without a DOM: the pure
 * band function, and the CSS contract the hook's attribute names must satisfy.
 * The DOM behaviour itself is exercised in e2e/landing.spec.ts against a real
 * browser, which is where a `document` actually exists.
 */

const BANDS: Array<CoachQualityBand> = ['good', 'off', 'poor'];

describe('qualityBandFor', () => {
  it('maps the coaching grade table onto three bands', () => {
    // Thresholds match docs/COACH_GATES.md: 80 is the good-form line, 60 the
    // keep-adjusting line.
    expect(qualityBandFor(100)).toBe('good');
    expect(qualityBandFor(95)).toBe('good');
    expect(qualityBandFor(80)).toBe('good');
    expect(qualityBandFor(79)).toBe('off');
    expect(qualityBandFor(60)).toBe('off');
    expect(qualityBandFor(59)).toBe('poor');
    expect(qualityBandFor(0)).toBe('poor');
  });

  it('treats an absent or non-finite score as no opinion, not as good', () => {
    // The dangerous default: an unknown score rendering as "good" would have
    // the bay congratulate an athlete who was never actually measured.
    expect(qualityBandFor(null)).toBeNull();
    expect(qualityBandFor(undefined)).toBeNull();
    expect(qualityBandFor(Number.NaN)).toBeNull();
    expect(qualityBandFor(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('is monotonic: the band never improves as the score falls', () => {
    const rank: Record<CoachQualityBand, number> = { good: 2, off: 1, poor: 0 };
    let previous = 3;
    for (let score = 100; score >= 0; score -= 1) {
      const band = qualityBandFor(score);
      if (band === null) continue;
      expect(rank[band], `score ${score} -> ${band}`).toBeLessThanOrEqual(previous);
      previous = rank[band];
    }
  });

  it('only ever emits a band the stylesheet styles', () => {
    for (let score = 0; score <= 100; score += 1) {
      const band = qualityBandFor(score);
      if (band !== null) expect(BANDS).toContain(band);
    }
  });
});

describe('bridge attribute contract', () => {
  /**
   * The hook writes attributes directly onto <body>; the atmosphere reads them
   * through these selectors. If a name drifts on either side the bay silently
   * stops reacting, which is exactly the flatness this work is meant to remove.
   */
  const REQUIRED_SELECTORS = [
    'body[data-coach-rep] .studio-atmosphere__arm-glow',
    'body[data-coach-rep] .studio-atmosphere__plinth',
    "body[data-coach-quality='good'] .studio-atmosphere__arm-photo",
    "body[data-coach-quality='poor'] .studio-atmosphere__arm-photo",
    "body[data-coach-quality='poor'] .studio-atmosphere__arm-photo--ghost",
    'body[data-coach-depth] .studio-atmosphere__arc',
  ];

  const readCss = () => {
    // Imported synchronously so the assertions below read as plain contract checks.
     
    return require('node:fs').readFileSync('src/styles/studio-atmosphere.css', 'utf8') as string;
  };

  it('styles every attribute the hook writes', () => {
    const css = readCss();
    for (const selector of REQUIRED_SELECTORS) {
      const attribute = selector.split('[')[1].split(']')[0];
      expect(css.includes(selector), `no rule for ${attribute} in studio-atmosphere.css`).toBe(
        true
      );
    }
  });

  it('styles all three quality bands the hook can emit', () => {
    const css = readCss();
    for (const band of BANDS) {
      expect(css.includes(`[data-coach-quality='${band}']`)).toBe(true);
    }
  });

  it('names the same attributes the hook writes', () => {
    const source = require('node:fs').readFileSync(
      'src/hooks/useCoachAtmosphereBridge.ts',
      'utf8'
    ) as string;
    for (const attribute of ['data-coach-rep', 'data-coach-quality', 'data-coach-depth']) {
      expect(source.includes(attribute), `hook never writes ${attribute}`).toBe(true);
      expect(readCss().includes(attribute), `css never reads ${attribute}`).toBe(true);
    }
  });

  it('collapses the reactive animations under reduced motion', () => {
    // The file has several reduced-motion blocks, so search all of them rather
    // than only the last — the athlete-reactive rules are not the final block.
    const css = readCss();
    const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) ?? [];
    const combined = blocks.join('\n');
    expect(combined).toContain('data-coach-rep');
    expect(combined).toContain('animation: none');
  });

  it('defines the keyframes its animations reference', () => {
    const css = readCss();
    for (const keyframe of ['arm-acknowledge', 'plinth-acknowledge']) {
      expect(
        css.includes(`animation: ${keyframe} `),
        `${keyframe} is animated but not defined`
      ).toBe(true);
      expect(css.includes(`@keyframes ${keyframe}`), `@keyframes ${keyframe} missing`).toBe(true);
    }
  });
});
