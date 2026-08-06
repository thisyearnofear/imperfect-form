import { describe, expect, it } from 'vitest';
import { BRAND } from './brandPositioning';

describe('collaboration positioning', () => {
  it('keeps partner proof subordinate to the user coaching promise', () => {
    expect(BRAND.tagline).toContain('Make one rep better');
    expect(BRAND.tagline).toContain('camera coaching');
    expect(BRAND.tagline).not.toMatch(/^Cyberwave/);
  });

  it('describes the physical coach as an honest enhancement', () => {
    expect(BRAND.studio.line2).toContain('SO-101');
    expect(BRAND.studio.line2).toContain('when connected');
    expect(BRAND.differentiation).toContain('robot exists to teach the human');
  });
});
