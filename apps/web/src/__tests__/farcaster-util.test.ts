import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storeSigner, SignerSchema } from '../utils/farcaster';

describe('storeSigner', () => {
  beforeEach(() => {
    globalThis.fetch = undefined as any;
  });

  it('succeeds on 200 OK', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    const payload = {
      signer_uuid: 'abc',
      fid: 123,
      reps: 10,
      exerciseMode: 'pushups',
      formattedTimeSpent: '00:01:23',
    };
    const result = await storeSigner(payload);
    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/farcaster/store-signer',
      expect.objectContaining({ method: 'POST' })
    );
  });
});