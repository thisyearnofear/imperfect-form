import { test, expect } from '@playwright/test';

/**
 * PoseRuntime prod-path smoke (docs/ARCHITECTURE.md):
 * - Curls start must not die on OffscreenCanvas / Strict Mode races
 * - Forced worker path (__IMF_FORCE_POSE_WORKER__) exercises the production
 *   desktop pipeline even under `next dev`
 */

test.describe('PoseRuntime - worker path + curls', () => {
  // shouldUsePoseWorker: mobile and dev always run the main thread by design;
  // the forced-worker smoke only exists for the desktop pipeline.
  test.skip(({ isMobile }) => !!isMobile, 'worker path is desktop-only by design');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
      localStorage.setItem('cameraPrimerSeen', 'true');
      // Force the production OffscreenCanvas worker path in development.
      (window as unknown as { __IMF_FORCE_POSE_WORKER__?: boolean }).__IMF_FORCE_POSE_WORKER__ =
        true;
    });
    await page.context().grantPermissions(['camera']);
  });

  test('curls start uses worker path and keeps the session alive', async ({ page }) => {
    const consoleLines: string[] = [];
    page.on('console', (msg) => consoleLines.push(msg.text()));

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /AI watches your exercise form/i })).toBeVisible(
      {
        timeout: 20000,
      }
    );

    // Curls lead the foyer because they are the clearest robot-demo path.
    await page.getByRole('button', { name: /Curls/i }).click();
    await expect(page.getByRole('button', { name: /Curls/i }).first()).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const start = page.locator('#startButton');
    await expect(start).toBeEnabled();
    await start.click();

    await expect(
      page.getByText(/Initializing Engine|Loading camera|Starting/i).first()
    ).toBeVisible({
      timeout: 15000,
    });

    // Pipeline publishes runtime status once detection boots.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const runtime = (
              window as unknown as {
                __IMF_POSE_RUNTIME__?: { path: string; mode: string };
              }
            ).__IMF_POSE_RUNTIME__;
            return runtime ?? null;
          }),
        { timeout: 30000 }
      )
      .toMatchObject({ path: 'worker', mode: 'curls' });

    // HUD should reflect curls — session was not killed by a ghost end.
    await expect(page.locator('.hud-label').filter({ hasText: /^curls$/i })).toBeVisible({
      timeout: 20000,
    });

    // Resize-after-transfer logs "Canvas already transferred" harmlessly.
    // Fail only if the pipeline bailed without recovery (no live runtime).
    const runtime = await page.evaluate(() => {
      return (
        window as unknown as {
          __IMF_POSE_RUNTIME__?: { path: string; mode: string };
        }
      ).__IMF_POSE_RUNTIME__;
    });
    expect(runtime).toMatchObject({ path: 'worker', mode: 'curls' });

    const ghostEnd = consoleLines.some(
      (line) =>
        /Session ended with summary/i.test(line) &&
        (/duration:\s*0\./i.test(line) || /"duration":\s*0\./i.test(line))
    );
    expect(ghostEnd).toBe(false);
  });
});
