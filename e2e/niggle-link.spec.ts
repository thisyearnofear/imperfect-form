import { test, expect } from '@playwright/test';

/**
 * Shared niggle link — the acquisition doorway (docs/DESIGN_EVOLUTION.md).
 * `?niggle=<joint>:<context>` restores the sender's intake chip and its
 * movement; `&from=` renders the greeting. An unknown joint must leave the
 * foyer exactly as a fresh visit would.
 */

test.describe('Shared niggle link', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
    });
  });

  test('restores the joint chip, sender greeting, and reading CTA', async ({ page }) => {
    await page.goto('/?niggle=neck-shoulders:desk&from=Udi');
    await expect(page.getByText('Udi sent you this')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'My neck & shoulders' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('#startButton')).toContainText('Take a 5-rep reading');
  });

  test('an unknown joint leaves the day-0 foyer untouched', async ({ page }) => {
    await page.goto('/?niggle=bogus');
    await expect(page.locator('#startButton')).toContainText('Take a reading', {
      timeout: 20000,
    });
    await expect(page.locator('.coach-foyer__pain-chip.is-selected')).toHaveCount(0);
  });
});
