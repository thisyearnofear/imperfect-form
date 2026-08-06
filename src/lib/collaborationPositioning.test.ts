import { describe, expect, it } from 'vitest';
import { BRAND } from './brandPositioning';

describe('collaboration positioning', () => {
  it('keeps partner proof subordinate to the user coaching promise', () => {
    expect(BRAND.tagline).toContain('Make one rep better');
    expect(BRAND.tagline).toContain('camera coaching');
    expect(BRAND.tagline).not.toMatch(/^Cyberwave/);
  });

  it('keeps the physical coach as honest, subordinate proof', () => {
    expect(BRAND.studio.line2).toBe('Camera catches one thing. Coach shows you the fix.');
    expect(BRAND.studio.line2).not.toContain('SO-101');
    expect(BRAND.differentiation).toContain('robot exists to teach the human');
  });
});
