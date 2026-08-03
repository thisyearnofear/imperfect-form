import { test, expect } from '@playwright/test';

/**
 * Ring 0 camera-granted paths (docs/NORTH_STAR.md): the healthy first run -
 * one press, one OS permission prompt, straight into the boot overlay.
 * Needs a media device, so Chromium fakes one (launchOptions must live at
 * file top level, hence the separate spec from ring0.spec.ts).
 */

// Fake media devices need the full Chromium binary (new headless), not the
// stripped headless shell: channel 'chromium'.
test.use({
  channel: 'chromium',
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-and-media-stream'],
  },
});

test.describe('Ring 0 - camera granted (fake device)', () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || !!isMobile,
    'fake media device path is validated on desktop Chromium only'
  );
  // Full-browser launch + dev-mode cold compile deserve headroom.
  test.setTimeout(120_000);

  const START_READY_TIMEOUT = 45_000;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
    });
    await page.context().grantPermissions(['camera']);
  });

  // The first-ever getUserMedia on a fresh fake-device browser can hang while
  // Chromium spins the device up. Warm it once per test (real browsers have a
  // known device list) so START's permission probe resolves promptly.
  async function warmFakeDevice(page: import('@playwright/test').Page) {
    await page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        // best-effort warm-up only
      }
    });
  }

  test('granted permission boots straight into the session — no pre-screen', async ({ page }) => {
    await page.goto('/');
    await warmFakeDevice(page);
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: START_READY_TIMEOUT });
    await start.click();

    // The recovery card must NOT appear on a healthy grant.
    await expect(page.getByText('Camera is off')).toHaveCount(0);

    // One continuous boot overlay takes over (step rail + honest phase copy).
    await expect(page.getByText(/Starting camera|Loading camera|Coach AI/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('returning guest (intro handled) starts directly', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cameraPrimerSeen', 'true');
    });
    await page.goto('/');
    await warmFakeDevice(page);
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: START_READY_TIMEOUT });
    await start.click();

    // Straight to the session boot sequence
    await expect(page.getByText(/Starting camera|Loading camera|Coach AI/i).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
