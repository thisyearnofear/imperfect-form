import { afterEach, describe, expect, it } from 'vitest';
import { getNetworkCapabilities, getNetworkClass, isConstrainedNetwork } from './networkQuality';

function setConnection(connection: unknown) {
  Object.defineProperty(globalThis.navigator, 'connection', {
    value: connection,
    configurable: true,
  });
}

function clearConnection() {
  Object.defineProperty(globalThis.navigator, 'connection', {
    value: undefined,
    configurable: true,
  });
}

describe('networkQuality', () => {
  afterEach(() => {
    clearConnection();
  });

  it('fails open to normal when the Network Information API is missing', () => {
    clearConnection();
    expect(getNetworkClass()).toBe('normal');
    expect(isConstrainedNetwork()).toBe(false);
    expect(getNetworkCapabilities()).toEqual({
      allowCloudTts: true,
      allowAnalytics: true,
      allowRemoteImages: true,
    });
  });

  it('treats save-data as constrained', () => {
    setConnection({ saveData: true, effectiveType: '4g' });
    expect(getNetworkClass()).toBe('constrained');
    expect(getNetworkCapabilities().allowCloudTts).toBe(false);
    expect(getNetworkCapabilities().allowAnalytics).toBe(false);
  });

  it('treats 2g and slow-2g as constrained', () => {
    setConnection({ effectiveType: '2g' });
    expect(isConstrainedNetwork()).toBe(true);
    setConnection({ effectiveType: 'slow-2g' });
    expect(isConstrainedNetwork()).toBe(true);
  });

  it('treats 3g and 4g as normal', () => {
    setConnection({ effectiveType: '3g' });
    expect(isConstrainedNetwork()).toBe(false);
    setConnection({ effectiveType: '4g' });
    expect(isConstrainedNetwork()).toBe(false);
  });
});
