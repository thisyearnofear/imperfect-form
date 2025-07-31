import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareCast, ShareCastInput } from '../src/shareCast';

describe('shareCast', () => {
  beforeEach(() => {
    globalThis.fetch = undefined as any;
  });

  it('calls Neynar with correct body and headers', async () => {
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
    const result = await shareCast(payload);
    expect(result).toEqual({ cast: { id: '123' } });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.neynar.com/v2/farcaster/cast',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ api_key: expect.any(String) }),
      })
    );
  });
});