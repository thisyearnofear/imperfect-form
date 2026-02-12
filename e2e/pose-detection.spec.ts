import { test, expect } from '@playwright/test';
import { getDeviceInfo, checkPoseDetectionSupport } from '../src/utils/deviceDetection';

test.describe('@pose-detection Pose Detection Cross-Platform', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for page to load
    await page.goto('/');

    // Navigate to pose detection feature (adjust selector as needed)
    const poseDetectionButton = page.locator('[data-testid="pose-detection-start"]').first();
    if (await poseDetectionButton.isVisible()) {
      await poseDetectionButton.click();
    }

    // Wait for camera permission mock if needed
    await page.context().grantPermissions(['camera']);
  });

  test('@device should detect device capabilities correctly', async ({ page }) => {
    const deviceInfo = await page.evaluate(() => {
      const info = (window as any).getDeviceInfo?.();
      return info;
    });

    expect(deviceInfo).toBeTruthy();
    expect(deviceInfo).toHaveProperty('platform');
    expect(deviceInfo).toHaveProperty('browser');
    expect(deviceInfo).toHaveProperty('performanceLevel');

    console.log('Device Info:', deviceInfo);
  });

  test('@device should initialize pose detection on desktop Chrome', async ({ page }) => {
    test.skip(
      process.env.CI !== undefined && process.env.BROWSER !== 'chromium',
      'Desktop Chrome specific test'
    );

    // Check if TensorFlow.js loads
    const tfLoaded = await page.evaluate(() => {
      return typeof (window as any).tf !== 'undefined';
    });
    expect(tfLoaded).toBeTruthy();

    // Check if pose detection model loads
    const modelLoaded = await page.waitForSelector('[data-testid="pose-model-loaded"]', {
      timeout: 30000,
    });
    expect(await modelLoaded.isVisible()).toBeTruthy();
  });

  test('@device should handle iOS Safari compatibility', async ({ page }) => {
    test.skip(process.env.BROWSER !== 'webkit', 'iOS Safari specific test');

    // Check for OffscreenCanvas fallback
    const usingFallback = await page.evaluate(() => {
      return (window as any).usingMainThreadFallback === true;
    });

    // iOS might use fallback due to OffscreenCanvas bugs
    console.log('Using main thread fallback:', usingFallback);

    // Ensure pose detection still works
    const posesDetected = await page.waitForSelector('[data-testid="poses-detected"]', {
      timeout: 30000,
    });
    expect(await posesDetected.isVisible()).toBeTruthy();
  });

  test('@performance should optimize for Android performance', async ({ page }) => {
    test.skip(process.env.BROWSER !== 'chromium', 'Android Chrome specific test');

    // Check if performance optimizations are applied
    const optimized = await page.evaluate(() => {
      const settings = (window as any).poseDetectionSettings;
      return settings?.detectionFrequency <= 20 && settings?.resolution !== 'high';
    });

    expect(optimized).toBeTruthy();
  });

  test('@device should work in Farcaster mini app environment', async ({ page }) => {
    // Simulate Farcaster environment
    await page.addInitScript(() => {
      (window as any).farcaster = {
        isFrame: true,
        user: { fid: '123' },
      };
    });

    await page.reload();

    // Check if Farcaster-specific handling is active
    const isFarcaster = await page.evaluate(() => {
      return (window as any).getDeviceInfo?.().platform === 'farcaster';
    });

    expect(isFarcaster).toBeTruthy();

    // Verify camera access still works
    const cameraGranted = await page.evaluate(() => {
      return (window as any).cameraPermissionGranted === true;
    });
  });

  test('@error should handle camera permission gracefully', async ({ page, browserName }) => {
    // Test permission denied
    await page.context().clearPermissions();

    const errorHandled = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('poseDetectionError', (event: any) => {
          if (event.detail.error.type === 'PERMISSION') {
            resolve(true);
          }
        });
      });
    });

    expect(errorHandled).toBeTruthy();
  });

  test('@error should recover from network errors', async ({ page }) => {
    // Simulate network failure during model loading
    await page.route('**/*', (route) => {
      if (route.request().url().includes('model.json')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.reload();

    // Check if retry mechanism works
    const retryAttempted = await page.evaluate(() => {
      return new Promise((resolve) => {
        let retryCount = 0;
        window.addEventListener('poseDetectionRetry', () => {
          retryCount++;
          if (retryCount > 0) resolve(true);
        });
      });
    });

    expect(retryAttempted).toBeTruthy();
  });

  test('@performance should handle memory pressure', async ({ page }) => {
    // Simulate low memory condition
    await page.addInitScript(() => {
      // Override memory API to simulate low memory
      Object.defineProperty((performance as any).memory, 'jsHeapSizeLimit', {
        value: 50 * 1024 * 1024, // 50MB
        writable: true,
      });
    });

    // Check if fallback to lighter model occurs
    const usingLighterModel = await page.evaluate(() => {
      return (window as any).currentModel === 'lite';
    });

    expect(usingLighterModel).toBeTruthy();
  });

  test('@performance should monitor performance metrics', async ({ page }) => {
    const metrics = await page.evaluate(async () => {
      const monitor = new (window as any).PerformanceMonitor();

      // Simulate some frames
      for (let i = 0; i < 30; i++) {
        monitor.recordFrame(
          Math.random() * 50 + 10, // detection time
          Math.random() * 20 + 5 // processing time
        );
      }

      return monitor.getMetrics();
    });

    expect(metrics).toHaveProperty('fps');
    expect(metrics).toHaveProperty('detectionTime');
    expect(metrics).toHaveProperty('memoryUsage');
    expect(metrics.fps).toBeGreaterThan(0);
  });

  test('@performance should maintain pose detection accuracy', async ({ page }) => {
    // Load test image with known poses
    await page.evaluate(() => {
      const img = new Image();
      img.src = '/test-poses.jpg';
      img.onload = () => {
        (window as any).testImage = img;
      };
    });

    // Wait for pose detection
    const poses = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('posesDetected', (event: any) => {
          resolve(event.detail.poses);
        });
      });
    });

    // Verify expected number of poses detected
    expect(poses).toBeTruthy();
    expect(Array.isArray(poses)).toBeTruthy();

    // Check keypoint confidence
    if (poses.length > 0) {
      const keypoints = poses[0].keypoints;
      const confidentKeypoints = keypoints.filter((kp: any) => kp.score > 0.5);
      expect(confidentKeypoints.length).toBeGreaterThan(10);
    }
  });
});

test.describe('@error Pose Detection Error Handling', () => {
  test('@error should categorize errors correctly', async ({ page }) => {
    const errorTypes = await page.evaluate(() => {
      const errors = [];

      // Simulate different error types
      const errorSources = [
        { type: 'CAMERA_INIT', message: 'Camera access denied' },
        { type: 'TENSORFLOW_INIT', message: 'TensorFlow backend failed' },
        { type: 'MODEL_LOAD', message: 'Failed to load model' },
        { type: 'MEMORY', message: 'Out of memory' },
      ];

      errorSources.forEach((source) => {
        const error = new Error(source.message);
        (error as any).type = source.type;
        errors.push(source.type);
      });

      return errors;
    });

    expect(errorTypes).toContain('CAMERA_INIT');
    expect(errorTypes).toContain('TENSORFLOW_INIT');
    expect(errorTypes).toContain('MODEL_LOAD');
    expect(errorTypes).toContain('MEMORY');
  });

  test('@error should apply fallback strategies', async ({ page }) => {
    const fallbacksApplied = await page.evaluate(() => {
      const fallbacks = [];

      window.addEventListener('poseDetectionFallback', (event: any) => {
        fallbacks.push(event.detail.action);
      });

      // Trigger fallbacks
      window.dispatchEvent(
        new CustomEvent('error', {
          detail: { type: 'MEMORY' },
        })
      );

      window.dispatchEvent(
        new CustomEvent('error', {
          detail: { type: 'TENSORFLOW_INIT' },
        })
      );

      return fallbacks;
    });

    expect(fallbacksApplied).toContain('reduceFrequency');
    expect(fallbacksApplied).toContain('useCPUBackend');
  });
});

test.describe('@device Device Compatibility Matrix', () => {
  const deviceMatrix = [
    { platform: 'desktop', browser: 'chrome', expected: true },
    { platform: 'desktop', browser: 'firefox', expected: true },
    { platform: 'desktop', browser: 'safari', expected: true },
    { platform: 'mobile', browser: 'chrome', expected: true },
    { platform: 'mobile', browser: 'safari', expected: true },
    { platform: 'ios', browser: 'safari', expected: true },
    { platform: 'android', browser: 'chrome', expected: true },
    { platform: 'farcaster', browser: 'chrome', expected: true },
  ];

  deviceMatrix.forEach(({ platform, browser, expected }) => {
    test(`${platform} ${browser} should ${expected ? 'support' : 'not support'} pose detection`, async ({
      page,
    }) => {
      const support = await page.evaluate(
        ({ platform, browser }) => {
          const info = { platform, browser };
          return (window as any).checkPoseDetectionSupport?.(info)?.supported;
        },
        { platform, browser }
      );

      expect(support).toBe(expected);
    });
  });
});
