import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareCast } from '../utils/farcaster';

describe('shareCast (frontend util)', () => {
  beforeEach(() => {
    globalThis.fetch = undefined as any;
  });

  it('posts to /api/farcaster/share', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ cast: { id: '123' } }),
    });
    const payload = {
      signer_uuid: 'uuid-1',
      text: 'Hello World',
      embeds: undefined,
      replyTo: undefined,
    };
    const result = await shareCast(payload as any);
    expect(result).toEqual({ cast: { id: '123' } });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/farcaster/share',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });
});