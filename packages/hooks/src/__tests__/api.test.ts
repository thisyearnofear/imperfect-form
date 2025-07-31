import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { fetchJson, ApiError } from '../api';

const TestSchema = z.object({
  foo: z.string(),
  bar: z.number(),
});

describe('fetchJson', () => {
  beforeEach(() => {
    globalThis.fetch = undefined as any; // clear fetch
  });

  it('parses valid JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ foo: 'hi', bar: 42 }),
    });
    const result = await fetchJson('https://test', TestSchema);
    expect(result).toEqual({ foo: 'hi', bar: 42 });
  });

  it('throws ApiError on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    await expect(
      fetchJson('https://fail', TestSchema)
    ).rejects.toThrowError(ApiError);
  });

  it('throws ApiError on invalid JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('fail')),
    });
    await expect(
      fetchJson('https://fail', TestSchema)
    ).rejects.toThrowError(ApiError);
  });

  it('throws ApiError on invalid schema', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ foo: 123, bar: 'nope' }),
    });
    await expect(
      fetchJson('https://fail', TestSchema)
    ).rejects.toThrowError(ApiError);
  });
});