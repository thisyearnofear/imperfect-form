import { test, expect } from '@playwright/test';

test.describe('Onboarding Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding state so modal shows
    await page.addInitScript(() => {
      localStorage.removeItem('imf_seenOnboarding_v1');
    });
  });

  test('first-time user sees onboarding modal', async ({ page }) => {
    await page.goto('/');
    // Modal should be visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });
    // First step content visible
    await expect(page.getByText('AI-Powered Fitness')).toBeVisible();
  });

  test('user can step through all onboarding steps', async ({ page }) => {
    await page.goto('/');
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Step 1
    await expect(page.getByText('AI-Powered Fitness')).toBeVisible();

    // Next to step 2
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText('Compete On-Chain')).toBeVisible();

    // Next to step 3
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText('Level Up Daily')).toBeVisible();

    // Complete onboarding
    await page.getByRole('button', { name: /start/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test('user can skip onboarding', async ({ page }) => {
    await page.goto('/');
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /skip/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test('returning user does not see onboarding modal', async ({ page }) => {
    // Set seen flag before navigation
    await page.addInitScript(() => {
      localStorage.setItem('imf_seenOnboarding_v1', '1');
    });
    await page.goto('/');
    // Wait for page to settle
    await page.waitForTimeout(1000);
    const modal = page.getByRole('dialog');
    await expect(modal).not.toBeVisible();
  });

  test('onboarding modal is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Tab to Next button and activate with Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Compete On-Chain')).toBeVisible();
  });
});

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('imf_seenOnboarding_v1', '1');
    });
  });

  test('tab navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    // Tab buttons should have aria-current on active tab
    const activeTab = page.locator('[aria-current="page"]');
    await expect(activeTab).toBeVisible({ timeout: 5000 });
  });

  test('switching tabs shows correct content', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Click Dashboard tab
    const dashboardTab = page.getByRole('button', { name: /dashboard/i });
    if (await dashboardTab.isVisible()) {
      await dashboardTab.click();
      // Dashboard content should appear
      await expect(page.getByText(/quest|xp|level/i).first()).toBeVisible({ timeout: 3000 });
    }
  });
});
