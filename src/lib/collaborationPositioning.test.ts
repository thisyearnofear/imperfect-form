import { describe, expect, it } from 'vitest';
import { BRAND } from './brandPositioning';

describe('collaboration positioning', () => {
  it('keeps partner proof subordinate to the user coaching promise', () => {
    expect(BRAND.tagline).toContain('Your niggle, measured');
    expect(BRAND.tagline).toContain('camera readings');
    expect(BRAND.tagline).not.toMatch(/^Cyberwave/);
  });

  it('keeps the physical coach as honest, subordinate proof', () => {
    expect(BRAND.studio.line2).toBe(
      'The camera reads how the joint moves today. Come back in a week and see what changed.'
    );
    expect(BRAND.studio.line2).not.toContain('SO-101');
    expect(BRAND.differentiation).toContain('robot exists to teach the human');
  });
});
