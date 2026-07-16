import { describe, expect, it } from 'vitest';
import { shouldUsePoseWorker } from './poseRuntime';

describe('shouldUsePoseWorker', () => {
  const desktopCapable = {
    isMobileDevice: false,
    supportsOffscreenCanvas: true,
    canTransferControl: true,
  };

  it('uses worker on production desktop', () => {
    expect(
      shouldUsePoseWorker({
        ...desktopCapable,
        nodeEnv: 'production',
      })
    ).toBe(true);
  });

  it('uses main thread in development by default (Strict Mode safety)', () => {
    expect(
      shouldUsePoseWorker({
        ...desktopCapable,
        nodeEnv: 'development',
      })
    ).toBe(false);
  });

  it('allows forceWorker smoke path in development', () => {
    expect(
      shouldUsePoseWorker({
        ...desktopCapable,
        nodeEnv: 'development',
        forceWorker: true,
      })
    ).toBe(true);
  });

  it('never uses worker on mobile', () => {
    expect(
      shouldUsePoseWorker({
        isMobileDevice: true,
        supportsOffscreenCanvas: true,
        canTransferControl: true,
        nodeEnv: 'production',
        forceWorker: true,
      })
    ).toBe(false);
  });

  it('falls back when OffscreenCanvas transfer is unavailable', () => {
    expect(
      shouldUsePoseWorker({
        isMobileDevice: false,
        supportsOffscreenCanvas: false,
        canTransferControl: false,
        nodeEnv: 'production',
        forceWorker: true,
      })
    ).toBe(false);
  });
});
