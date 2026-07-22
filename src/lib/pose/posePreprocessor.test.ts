import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getDefaultPreprocessorSettings,
  normalizePreprocessorSettings,
  preprocessImageData,
  loadPreprocessorSettings,
  savePreprocessorSettings,
  PREPROCESSOR_STORAGE_KEY,
} from './posePreprocessor';

class MockImageData {
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number
  ) {}
}

beforeAll(() => {
  (globalThis as unknown as { ImageData: typeof MockImageData }).ImageData = MockImageData;

  // Provide a minimal localStorage mock for node-based Vitest runs.
  if (typeof window === 'undefined') {
    const store = new Map<string, string>();
    const localStorageMock: Storage = {
      length: 0,
      clear: () => store.clear(),
      key: (index) => Array.from(store.keys())[index] ?? null,
      getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    };
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: localStorageMock },
      writable: true,
    });
  }
});

describe('posePreprocessor', () => {
  describe('normalizePreprocessorSettings', () => {
    it('returns defaults for empty input', () => {
      const result = normalizePreprocessorSettings({});
      expect(result).toEqual(getDefaultPreprocessorSettings());
    });

    it('clamps targetMean to [0.1, 0.9]', () => {
      const low = normalizePreprocessorSettings({ targetMean: 0.05 });
      expect(low.targetMean).toBe(0.1);

      const high = normalizePreprocessorSettings({ targetMean: 1.2 });
      expect(high.targetMean).toBe(0.9);

      const mid = normalizePreprocessorSettings({ targetMean: 0.5 });
      expect(mid.targetMean).toBe(0.5);
    });

    it('clamps strength to [0, 1]', () => {
      const low = normalizePreprocessorSettings({ strength: -0.5 });
      expect(low.strength).toBe(0);

      const high = normalizePreprocessorSettings({ strength: 2 });
      expect(high.strength).toBe(1);
    });
  });

  describe('preprocessImageData', () => {
    function makeImageData(r: number, g: number, b: number): ImageData {
      const data = new Uint8ClampedArray(4);
      data[0] = r;
      data[1] = g;
      data[2] = b;
      data[3] = 255;
      return new ImageData(data, 1, 1);
    }

    it('is a no-op when disabled', () => {
      const imageData = makeImageData(100, 120, 90);
      preprocessImageData(imageData, {
        enabled: false,
        mode: 'none',
        targetMean: 0.5,
        strength: 0.75,
      });
      expect(imageData.data[0]).toBe(100);
      expect(imageData.data[1]).toBe(120);
      expect(imageData.data[2]).toBe(90);
    });

    it('brightens dark pixels when enabled', () => {
      const imageData = makeImageData(10, 10, 10);
      preprocessImageData(imageData, { enabled: true, mode: 'auto', targetMean: 0.5, strength: 1 });
      // A dark gray pixel should be lifted toward the target mean.
      expect(imageData.data[0]).toBeGreaterThan(10);
      expect(imageData.data[1]).toBeGreaterThan(10);
      expect(imageData.data[2]).toBeGreaterThan(10);
    });

    it('preserves alpha channel', () => {
      const imageData = makeImageData(10, 10, 10);
      preprocessImageData(imageData, { enabled: true, mode: 'auto', targetMean: 0.5, strength: 1 });
      expect(imageData.data[3]).toBe(255);
    });
  });

  describe('localStorage integration', () => {
    beforeEach(() => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PREPROCESSOR_STORAGE_KEY);
      }
    });

    it('has a stable storage key', () => {
      expect(PREPROCESSOR_STORAGE_KEY).toBe('prefPosePreprocessor');
    });

    it('saves and loads settings', () => {
      const settings = { enabled: true, mode: 'auto' as const, targetMean: 0.6, strength: 0.5 };
      savePreprocessorSettings(settings);
      const loaded = loadPreprocessorSettings();
      expect(loaded.enabled).toBe(true);
      expect(loaded.mode).toBe('auto');
      expect(loaded.targetMean).toBe(0.6);
      expect(loaded.strength).toBe(0.5);
    });

    it('returns defaults when localStorage contains invalid JSON', () => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(PREPROCESSOR_STORAGE_KEY, 'not-json');
      const loaded = loadPreprocessorSettings();
      expect(loaded).toEqual(getDefaultPreprocessorSettings());
    });
  });
});
