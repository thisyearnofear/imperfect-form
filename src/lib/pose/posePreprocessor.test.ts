import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getDefaultPreprocessorSettings,
  normalizePreprocessorSettings,
  preprocessImageData,
  loadPreprocessorSettings,
  savePreprocessorSettings,
  PREPROCESSOR_STORAGE_KEY,
  applyCameraCalibration,
  applyToneCurveEnhancement,
  type PosePreprocessorSettings,
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
        autoExposure: false,
        cameraCalibration: false,
        distortionFactor: -0.1,
        generativeCleanup: false,
        generativeModelUrl: null,
        cpuFilterMaxPixels: 640 * 480,
      });
      expect(imageData.data[0]).toBe(100);
      expect(imageData.data[1]).toBe(120);
      expect(imageData.data[2]).toBe(90);
    });

    it('brightens dark pixels when enabled', () => {
      const imageData = makeImageData(10, 10, 10);
      preprocessImageData(imageData, {
        enabled: true,
        mode: 'auto',
        targetMean: 0.5,
        strength: 1,
        autoExposure: true,
        cameraCalibration: false,
        distortionFactor: -0.1,
        generativeCleanup: false,
        generativeModelUrl: null,
        cpuFilterMaxPixels: 640 * 480,
      });
      // A dark gray pixel should be lifted toward the target mean.
      expect(imageData.data[0]).toBeGreaterThan(10);
      expect(imageData.data[1]).toBeGreaterThan(10);
      expect(imageData.data[2]).toBeGreaterThan(10);
    });

    it('preserves alpha channel', () => {
      const imageData = makeImageData(10, 10, 10);
      preprocessImageData(imageData, {
        enabled: true,
        mode: 'auto',
        targetMean: 0.5,
        strength: 1,
        autoExposure: true,
        cameraCalibration: false,
        distortionFactor: -0.1,
        generativeCleanup: false,
        generativeModelUrl: null,
        cpuFilterMaxPixels: 640 * 480,
      });
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
      const settings = {
        enabled: true,
        mode: 'auto' as const,
        targetMean: 0.6,
        strength: 0.5,
        autoExposure: true,
        cameraCalibration: false,
        distortionFactor: -0.1,
        generativeCleanup: false,
        generativeModelUrl: null,
        cpuFilterMaxPixels: 640 * 480,
      };
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

  describe('applyCameraCalibration', () => {
    function makeCalibrationSettings(
      partial: Partial<PosePreprocessorSettings> = {}
    ): PosePreprocessorSettings {
      return {
        enabled: true,
        mode: 'none',
        targetMean: 0.5,
        strength: 0.75,
        autoExposure: false,
        cameraCalibration: true,
        distortionFactor: -0.2,
        generativeCleanup: false,
        generativeModelUrl: null,
        cpuFilterMaxPixels: 640 * 480,
        ...partial,
      };
    }

    it('processes small frames at full resolution', () => {
      const width = 80;
      const height = 60;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 100;
        data[i + 1] = 120;
        data[i + 2] = 90;
        data[i + 3] = 255;
      }
      const imageData = new ImageData(data, width, height);

      applyCameraCalibration(imageData, makeCalibrationSettings());

      expect(imageData.width).toBe(width);
      expect(imageData.height).toBe(height);
      // Alpha should remain 255 for all pixels.
      for (let i = 3; i < data.length; i += 4) {
        expect(data[i]).toBe(255);
      }
    });

    it('processes large frames with virtual downsampling instead of skipping', () => {
      // 600x600 exceeds the default 640x480 budget and triggers stride > 1,
      // while keeping the test fast enough to finish in under 5s.
      const width = 600;
      const height = 600;
      const data = new Uint8ClampedArray(width * height * 4);
      // Fill a diagonal-ish pattern so distortion has a visible effect.
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = x % 256;
          data[idx + 1] = y % 256;
          data[idx + 2] = (x + y) % 256;
          data[idx + 3] = 255;
        }
      }
      const imageData = new ImageData(data, width, height);
      const before = new Uint8ClampedArray(data);

      applyCameraCalibration(imageData, makeCalibrationSettings());

      // Distortion should have mutated at least some pixels.
      let changed = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (
          data[i] !== before[i] ||
          data[i + 1] !== before[i + 1] ||
          data[i + 2] !== before[i + 2]
        ) {
          changed++;
        }
      }
      expect(changed).toBeGreaterThan(0);

      // Output dimensions and alpha should be unchanged.
      expect(imageData.width).toBe(width);
      expect(imageData.height).toBe(height);
      for (let i = 3; i < data.length; i += 4) {
        expect(data[i]).toBe(255);
      }
    });
  });

  describe('applyToneCurveEnhancement', () => {
    function makeToneCurveSettings(
      partial: Partial<PosePreprocessorSettings> = {}
    ): PosePreprocessorSettings {
      return {
        enabled: true,
        mode: 'none',
        targetMean: 0.5,
        strength: 0.75,
        autoExposure: false,
        cameraCalibration: false,
        distortionFactor: -0.1,
        generativeCleanup: true,
        generativeModelUrl: null,
        cpuFilterMaxPixels: 640 * 480,
        ...partial,
      };
    }

    it('processes small frames at full resolution', () => {
      const width = 80;
      const height = 60;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 20;
        data[i + 1] = 20;
        data[i + 2] = 20;
        data[i + 3] = 255;
      }
      const imageData = new ImageData(data, width, height);

      applyToneCurveEnhancement(imageData, makeToneCurveSettings());

      expect(imageData.width).toBe(width);
      expect(imageData.height).toBe(height);
      for (let i = 3; i < data.length; i += 4) {
        expect(data[i]).toBe(255);
      }
    });

    it('processes large frames with strided histogram instead of skipping', () => {
      // 600x600 exceeds the default 640x480 budget and triggers stride > 1,
      // while keeping the test fast enough to finish in under 5s.
      const width = 600;
      const height = 600;
      const data = new Uint8ClampedArray(width * height * 4);
      // Mix of dark and bright pixels so histogram equalization does work.
      for (let i = 0; i < data.length; i += 4) {
        const isDark = (i / 4) % 2 === 0;
        data[i] = isDark ? 20 : 220;
        data[i + 1] = isDark ? 20 : 220;
        data[i + 2] = isDark ? 20 : 220;
        data[i + 3] = 255;
      }
      const imageData = new ImageData(data, width, height);
      const before = new Uint8ClampedArray(data);

      applyToneCurveEnhancement(imageData, makeToneCurveSettings());

      let changed = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (
          data[i] !== before[i] ||
          data[i + 1] !== before[i + 1] ||
          data[i + 2] !== before[i + 2]
        ) {
          changed++;
        }
      }
      expect(changed).toBeGreaterThan(0);

      expect(imageData.width).toBe(width);
      expect(imageData.height).toBe(height);
      for (let i = 3; i < data.length; i += 4) {
        expect(data[i]).toBe(255);
      }
    });
  });
});
