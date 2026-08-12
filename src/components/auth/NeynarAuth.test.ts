import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNeynarClientId } from './NeynarAuth';

describe('useNeynarClientId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when Neynar is not configured', () => {
    vi.stubEnv('NEXT_PUBLIC_NEYNAR_CLIENT_ID', '');

    expect(useNeynarClientId()).toBeNull();
  });

  it('returns the configured client ID', () => {
    vi.stubEnv('NEXT_PUBLIC_NEYNAR_CLIENT_ID', 'client-test-123');

    expect(useNeynarClientId()).toBe('client-test-123');
  });
});
