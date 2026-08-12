import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NeynarAuthProvider } from '@/contexts/NeynarAuthContext';
import FarcasterShare from './FarcasterShare';

describe('FarcasterShare', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the manual share fallback without a Neynar client ID', () => {
    vi.stubEnv('NEXT_PUBLIC_NEYNAR_CLIENT_ID', '');

    const markup = renderToStaticMarkup(
      <NeynarAuthProvider clientId="">
        <FarcasterShare reps={5} exerciseMode="curls" timeSpent="30s" />
      </NeynarAuthProvider>
    );

    expect(markup).toContain('Share via Warpcast');
    expect(markup).not.toContain('Neynar client ID is not configured');
  });
});
