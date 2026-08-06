import { describe, expect, it } from 'vitest';
import { SESSION_INTENTS } from './brandPositioning';

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
});
