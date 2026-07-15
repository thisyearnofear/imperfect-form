import { test, expect } from '@playwright/test';

/**
 * Ring 0 guard - the product's most important invariant (docs/NORTH_STAR.md):
 * the core loop must be fully usable with NO wallet, NO sign-in, NOTHING.
 * If any of these fail, someone has re-gated the front door.
 */

test.describe('Ring 0 - wallet-free core loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Fresh guest, past the informational surfaces
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1'); // skip onboarding modal
      localStorage.setItem('imf_skipWalletIntro', '1'); // skip intro dialog
    });
  });

  test('START is enabled for a guest with no wallet', async ({ page }) => {
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeVisible({ timeout: 20000 });
    // THE invariant: no wallet, START still works
    await expect(start).toBeEnabled();
  });

  test('first START shows the camera primer before any permission prompt', async ({ page }) => {
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });
    await start.click();

    // Calm-register privacy explainer appears (not the browser prompt)
    await expect(page.getByText('Your camera stays private')).toBeVisible({ timeout: 5000 });

    // Enabling proceeds into the workout boot sequence
    await page.getByRole('button', { name: /enable camera/i }).click();
    await expect(page.getByText(/Initializing Engine|Loading camera/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test('primer "not now" backs out without starting', async ({ page }) => {
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });
    await start.click();

    await expect(page.getByText('Your camera stays private')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /not now/i }).click();

    await expect(page.getByText('Your camera stays private')).not.toBeVisible();
    // Still on the menu, still ungated
    await expect(start).toBeEnabled();
  });

  test('returning guest (primer seen) starts directly', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cameraPrimerSeen', 'true');
    });
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });
    await start.click();

    // No primer - straight to the workout boot sequence
    await expect(page.getByText(/Initializing Engine|Loading camera/i)).toBeVisible({
      timeout: 15000,
    });
  });
});
