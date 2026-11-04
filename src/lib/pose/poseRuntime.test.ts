import { describe, expect, it } from 'vitest';
import { shouldUsePoseWorker, workerReadyTimeoutMsForTracker } from './poseRuntime';

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

  it('never routes tasks-vision trackers to the worker', () => {
    // Module workers don't support importScripts, which the tasks-vision WASM
    // loader calls — the init hangs silently until the watchdog. The tracker
    // goes straight to the main thread even on capable production desktops.
    expect(
      shouldUsePoseWorker({
        ...desktopCapable,
        nodeEnv: 'production',
        trackerRuntime: 'tasks-vision',
      })
    ).toBe(false);
  });

  it('keeps tasks-vision on main thread even when worker is forced', () => {
    // forceWorker is a smoke tool for the production path — but a forced
    // worker still cannot init tasks-vision, so the runtime check wins.
    expect(
      shouldUsePoseWorker({
        ...desktopCapable,
        nodeEnv: 'development',
        forceWorker: true,
        trackerRuntime: 'tasks-vision',
      })
    ).toBe(false);
  });

  it('still routes tfjs trackers to the worker on production desktop', () => {
    expect(
      shouldUsePoseWorker({
        ...desktopCapable,
        nodeEnv: 'production',
        trackerRuntime: 'tfjs',
      })
    ).toBe(true);
  });
});

describe('workerReadyTimeoutMsForTracker', () => {
  it('keeps the 20s watchdog for lightning', () => {
    expect(workerReadyTimeoutMsForTracker('movenet-lightning')).toBe(20_000);
  });

  it('widens the watchdog for slow-booting trackers', () => {
    // Thunder/landmarker model fetch + backend compile outlast a
    // lightning-tight watchdog on a cold device.
    expect(workerReadyTimeoutMsForTracker('movenet-thunder')).toBe(45_000);
    expect(workerReadyTimeoutMsForTracker('poselandmarker-full')).toBe(45_000);
    expect(workerReadyTimeoutMsForTracker('blazepose')).toBe(45_000);
  });
});
