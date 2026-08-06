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
});
