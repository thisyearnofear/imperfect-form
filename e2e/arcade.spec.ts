import { test, expect } from '@playwright/test';

/**
 * Arcade (Train) + calm (Breathe) registers — the explicit entry moods beyond
 * the day-0 studio door. Train is discoverable from the earned shell (pill)
 * and via deep-link; Breathe opens its calm panel directly from the shell.
 * These are pre-start assertions only — no camera permission is exercised.
 */

test.describe('Arcade / Train register', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1'); // skip onboarding modal
      localStorage.setItem('imf_skipWalletIntro', '1'); // skip intro dialog
    });
  });

  test('Train pill in the earned shell opens the arcade foyer', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('imf_hasTrained', '1'); // earned shell
    });
    await page.goto('/');

    // Train is earned chrome — the pill only exists in the earned shell.
    await expect(page.locator('body')).toHaveAttribute('data-shell', 'earned', { timeout: 20000 });
    const trainPill = page.getByRole('button', { name: /Train — arcade workout mode/i });
    await expect(trainPill).toBeVisible();
    await expect(trainPill).toHaveAttribute('aria-pressed', 'false');

    await trainPill.click();

    // Arcade foyer: gold cabinet frame + Press Start copy + movement picker.
    await expect(page.locator('.prestart-foyer--arcade')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'arcade');
    await expect(page.locator('#game-container')).toHaveAttribute('data-register', 'arcade');
    await expect(page.getByRole('radio', { name: /CURLS movement/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /PICK A MOVE · START/i })).toBeVisible();
    // The pill reports the active register (toggle semantics).
    await expect(trainPill).toHaveAttribute('aria-pressed', 'true');
  });

  test('movement picker selects before start', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('imf_hasTrained', '1');
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Train — arcade workout mode/i }).click();
    await expect(page.locator('.prestart-foyer--arcade')).toBeVisible({ timeout: 20000 });

    const pushups = page.getByRole('radio', { name: /PUSH-UPS movement/i });
    await expect(pushups).toBeVisible();
    await expect(pushups).toHaveAttribute('aria-checked', 'false');
    await pushups.click();
    await expect(pushups).toHaveAttribute('aria-checked', 'true');
  });

  test('deep-link ?intent=train lands on the arcade foyer', async ({ page }) => {
    await page.goto('/?intent=train');
    await expect(page.locator('.prestart-foyer--arcade')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'arcade');
  });
});

test.describe('Calm / Breathe register', () => {
  test.setTimeout(90_000);

  test('Breathe pill opens the calm panel directly', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('imf_hasTrained', '1');
    });
    await page.goto('/');
    const breathePill = page.getByRole('button', { name: /Breathe — calm recovery mode/i });
    await expect(breathePill).toBeVisible({ timeout: 20000 });

    await breathePill.click();
    await expect(page.locator('[data-testid="calm-session-panel"]')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'calm');
    await expect(breathePill).toHaveAttribute('aria-pressed', 'true');
  });
});
