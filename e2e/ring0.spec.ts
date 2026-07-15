import { test, expect } from '@playwright/test';

/**
 * Ring 0 guard - the product's most important invariant (docs/NORTH_STAR.md):
 * the core loop must be fully usable with NO wallet, NO sign-in, NOTHING.
 * If any of these fail, someone has re-gated the front door.
 *
 * Also locks the day-0 foyer: brand + vision before XP/emoji chrome.
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

  test('day-0 foyer sells form understanding, not XP chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('IMPERFECT FORM').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/CAMERA READS FORM/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/ON-DEVICE/i)).toBeVisible();
    // Intent doorway present; default Train / Arcade keeps Ring 0 ungated
    await expect(page.getByRole('radio', { name: /Train — arcade workout/i })).toBeVisible();
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'arcade');
    // Game-loop tabs stay earned — not the foyer
    await expect(page.getByRole('button', { name: /Switch to Dashboard/i })).toHaveCount(0);
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled();
  });

  test('intent chooser commits register without gating START', async ({ page }) => {
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });

    await page.getByRole('radio', { name: /Coach — form understanding studio/i }).click();
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'studio');
    await expect(page.locator('#game-container')).toHaveAttribute('data-register', 'studio');
    await expect(page.getByText(/Your camera understands your form/i)).toBeVisible();
    await expect(start).toHaveText('Begin');
    await expect(start).toBeEnabled();

    await page.getByRole('radio', { name: /Breathe — calm recovery/i }).click();
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'calm');
    await expect(page.locator('#game-container')).toHaveAttribute('data-register', 'calm');
    await expect(page.getByText(/Settle the system/i)).toBeVisible();
    await expect(start).toHaveText('Breathe');
    await expect(start).toBeEnabled();
    await expect(page.getByTestId('mode-switch')).toHaveCount(0);

    await page.getByRole('radio', { name: /Train — arcade workout/i }).click();
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'arcade');
    await expect(start).toHaveText('START');
    await expect(start).toBeEnabled();
  });

  test('Breathe intent opens calm session without camera primer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: /Breathe — calm recovery/i }).click();
    const start = page.locator('#startButton');
    await expect(start).toHaveText('Breathe');
    await start.click();

    await expect(page.getByTestId('calm-session-panel')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Your camera stays private')).toHaveCount(0);

    // Chooser first — light register, both paths
    const panel = page.getByTestId('calm-session-panel');
    await expect(panel.getByText('Calm')).toBeVisible();
    await panel.getByRole('button', { name: /Stretch/i }).click();
    await expect(panel.getByText(/\d+ of \d+/i)).toBeVisible({ timeout: 5000 });

    await panel.getByRole('button', { name: /skip/i }).click();
    await page.locator('#resetButton').click();
    await expect(page.getByTestId('calm-session-panel')).toHaveCount(0);
    await expect(start).toBeEnabled();
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
