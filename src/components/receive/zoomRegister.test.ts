import { afterEach, describe, expect, it, vi } from 'vitest';
import { getZoomRegister, setZoomRegister, subscribeZoomRegister } from './zoomRegister';

/**
 * The zoom register is one shared magnification per session — module
 * state, no storage. These pin the default (`anatomy` — the hero plate's
 * register) and the subscribe/notify contract useZoomRegister rides on.
 */
describe('zoomRegister', () => {
  afterEach(() => setZoomRegister('anatomy'));

  it('defaults to anatomy — the plate teardown is the hero register', () => {
    expect(getZoomRegister()).toBe('anatomy');
  });

  it('persists across subscriber churn — the choice outlives any plate', () => {
    const off = subscribeZoomRegister(vi.fn());
    setZoomRegister('move');
    off();
    // A "remount" (fresh subscriber) reads the picked register.
    expect(getZoomRegister()).toBe('move');
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const heard = vi.fn();
    const off = subscribeZoomRegister(heard);
    setZoomRegister('built');
    expect(heard).toHaveBeenCalledTimes(1);
    off();
    setZoomRegister('anatomy');
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('setting the current register is a no-op — no listener noise', () => {
    const heard = vi.fn();
    const off = subscribeZoomRegister(heard);
    setZoomRegister('anatomy');
    expect(heard).not.toHaveBeenCalled();
    off();
  });
});
