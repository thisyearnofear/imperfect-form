import { describe, expect, it } from 'vitest';
import { BRAND, SESSION_INTENTS } from './brandPositioning';

describe('brand positioning foyer copy', () => {
  it('gives every entry register a clear invitation and action', () => {
    for (const intent of SESSION_INTENTS) {
      expect(intent.foyer.brand).toBeTruthy();
      expect(intent.foyer.line1).toBeTruthy();
      expect(intent.foyer.line2).toBeTruthy();
      expect(intent.foyer.loopLabel).toBeTruthy();
      expect(intent.foyer.invitation).toBeTruthy();
      expect(intent.foyer.cta).toBeTruthy();
    }
  });

  it('keeps the shared loop label stable for the boot, recap, and receipt surfaces', () => {
    // SessionRecap stamps the Form Receipt with BRAND.loopLabel; the studio
    // register carries the same loop label. The crafft register intentionally
    // uses its own lineage vocabulary (PHOTO IN / FIX OUT), so only the
    // studio-facing label must match the shared one.
    expect(BRAND.loopLabel).toBe('ONE REP / ONE FIX');
    const studio = SESSION_INTENTS.find((intent) => intent.id === 'understand');
    expect(studio?.foyer.loopLabel).toBe(BRAND.loopLabel);
  });

  it('surfaces Sandow heritage and an honest recap beat in the main product copy', () => {
    expect(BRAND.sandowGrade).toMatch(/Sandow/);
    expect(BRAND.sandowGrade).toMatch(/1897/);
    expect(BRAND.sandowSpan).toBe('1897 → 2026');
    expect(BRAND.flywheelLine).toMatch(/stored on your device/i);
    expect(BRAND.flywheelTrust).toMatch(/nothing was uploaded/i);
  });

  it('never claims the session trains the robot', () => {
    // Nothing exports a browser session into a policy, so copy asserting the
    // loop is closed is a false claim shown to every user who finishes a set.
    // See docs/ROADMAP.md Milestone 3, which is unchecked.
    for (const [key, value] of Object.entries(BRAND)) {
      if (typeof value !== 'string') continue;
      expect(value, `BRAND.${key} claims the session trains the robot`).not.toMatch(
        /coaching episode for the arm/i
      );
    }
  });
});
